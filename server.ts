import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { Pool } from 'pg';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

// Connecting to PostgreSQL database
const pool = new Pool({
  user: 'group16',
  host: 'bastion.cs.virginia.edu',
  database: 'group16',
  password: 'D7nrA8X6',
  port: 5432,
});

// Configure Passport Local Strategy
passport.use(new LocalStrategy(
  async (username: string, password: string, done: (error: any, user?: any, info?: any) => void) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      const user = result.rows[0];
      // NOTE: In production, use hashed passwords. For demonstration, plain-text is used.
      if (user.password !== password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user, undefined);
    } catch (err) {
      return done(err, false, undefined);
    }
  }
));


// Serialize user ID to store in the session
passport.serializeUser((user: any, done) => {
  done(null, user.user_id);
});

// Deserialize user from session by user ID
passport.deserializeUser(async (id: number, done) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE user_id = $1', [id]);
    if (result.rows.length > 0) {
      done(null, result.rows[0]);
    } else {
      done(new Error('User not found'));
    }
  } catch (err) {
    done(err);
  }
});


export function app(): express.Express {
  const server = express();
  server.use(bodyParser.json());
  server.use(cors({
    origin: 'http://localhost:4200'
  }));
  server.use(session({
    secret: 'use7ys7037286133', // Use a strong secret in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true in production with HTTPS
      maxAge: 1000 * 60 * 60, // 1 hour
    },
  }));
  server.use(passport.initialize());
  server.use(passport.session());

  const serverDistFolder = dirname(fileURLToPath(import.meta.url));
  const browserDistFolder = resolve(serverDistFolder, '../browser');
  const indexHtml = join(serverDistFolder, 'index.server.html');

  const commonEngine = new CommonEngine();

  server.set('view engine', 'html');
  server.set('views', browserDistFolder);

  server.use(express.json());

  server.get('/api/test-db', async (req, res) => {
    try {
      const result = await pool.query('SELECT * FROM users');
      res.json(result.rows);
    } catch (error) {
      console.error('Database connection error:', error);
      res.status(500).send('DB error');
    }
  });

  server.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
      await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        [username, password]
      );
      // After registration, retrieve the new user and log them in
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length > 0) {
        const user = result.rows[0];
        req.login(user, (err) => {
          if (err) {
            console.error('Error logging in after registration:', err);
            return res.status(500).json({ success: false, error: err });
          }
          return res.status(201).json({ success: true, user });
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ success: false, error: err });
    }
  });

  server.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any): void => {
      if (err) {
        console.error('Login error:', err);
        res.status(500).json({ success: false, error: err });
        return;
      }
      if (!user) {
        res.status(401).json({ success: false, message: info.message || 'Invalid credentials' });
        return;
      }
      req.login(user, (err: any): void => {
        if (err) {
          console.error('Login error:', err);
          res.status(500).json({ success: false, error: err });
          return;
        }
        res.json({ success: true, user });
        return;
      });
      return;
    })(req, res, next);
  });
  


  function ensureAuthenticated(req: express.Request, res: express.Response, next: express.NextFunction) {
    if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: 'Unauthorized' });
  }

  server.post('/api/update-profile', ensureAuthenticated, async (req, res) => {
    // Passport populates req.user after successful authentication.
    const user = req.user as any;
    const userId = user.user_id;
    const { age, gender, weight_lb, height_ft, height_in } = req.body;
    try {
      const updateQuery = `
        UPDATE users
        SET age = $1, gender = $2, weight_lb = $3, height_ft = $4, height_in = $5
        WHERE user_id = $6
      `;
      await pool.query(updateQuery, [age, gender, weight_lb, height_ft, height_in, userId]);
      return res.status(200).json({ message: 'Profile updated successfully' });
    } catch (error) {
      console.error('Profile update error:', error);
      return res.status(500).json({ message: 'Update failed' });
    }
  });

  // Logout endpoint
  server.post('/api/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({ success: false, message: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      return res.status(200).json({ success: true, message: 'Logged out successfully' });
    });
  });

  server.get('**', express.static(browserDistFolder, {
    maxAge: '1y',
    index: 'index.html',
  }));

  server.get('*', (req, res, next) => {
    commonEngine
      .render({
        bootstrap,
        documentFilePath: indexHtml,
        url: req.originalUrl,
        publicPath: browserDistFolder,
        providers: [{ provide: APP_BASE_HREF, useValue: req.baseUrl }],
      })
      .then(html => res.send(html))
      .catch(err => next(err));
  });

  return server;
}

function run(): void {
  const port = process.env['PORT'] || 4000;
  const server = app();
  server.listen(port, () => {
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

run();
