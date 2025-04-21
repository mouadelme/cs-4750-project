import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { Pool } from 'pg';
import { AuthService } from './auth.service';
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

passport.use(new LocalStrategy(
  async (username: string, password: string, done: (error: any, user?: any, info?: any) => void) => {
    try {
      const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
      if (result.rows.length === 0) {
        return done(null, false, { message: 'Incorrect username.' });
      }
      const user = result.rows[0];
      if (user.password !== password) {
        return done(null, false, { message: 'Incorrect password.' });
      }
      return done(null, user, undefined);
    } catch (err) {
      return done(err, false, undefined);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.user_id);
});

passport.deserializeUser(async (id: number, done: (err: any, user?: any) => void) => {
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
    origin: 'http://localhost:4200',
    credentials: true
  }));

  server.use(session({
    secret: 'use7ys123456',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Set to true if using HTTPS
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
      const result = await pool.query('SELECT * FROM exercise_log');
      res.json(result.rows);
    } catch (error) {
      console.error('Database connection error:', error);
      res.status(500).send('DB error');
    }
  });

  server.get('/api/current-user', (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ username: (req.user as any).username });
    } else {
      res.status(401).json({ message: 'Not authenticated' });
    }
  });
  
  server.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    try {
      await pool.query(
        'INSERT INTO users (username, password) VALUES ($1, $2)',
        [username, password]
      );
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


  server.get('/api/exercises', async (req, res) => {
    try {
      const exercisesResult = await pool.query(
        'SELECT exercise_id, exercise_type, exercise_description FROM exercise'
      );
      res.json(exercisesResult.rows);
    } catch (error) {
      console.error('Error fetching exercises:', error);
      res.status(500).json({ error: 'Failed to fetch exercises' });

    }
  });


  server.post('/api/log-exercise', async (req, res) => {
    const { exercise_id, duration_min, calories_burned, username } = req.body;
  
    if (!username || !exercise_id || !duration_min || !calories_burned) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
  
    try {
      await pool.query(
        `INSERT INTO exercise_log (exercise_id, duration_min, calories_burned, username, exercise_date)
         VALUES ($1, $2, $3, $4, NOW())`,
        [exercise_id, duration_min, calories_burned, username]
      );
      return res.status(201).json({ message: 'Exercise logged successfully!' });
    } catch (err) {
      console.error('Logging exercise failed:', err);
      return res.status(500).json({ message: 'Server error while logging exercise' });
    }
  });
  
  server.get('/api/user-exercises/:username', async (req, res) => {
    const { username } = req.params;
  
    try {
      const result = await pool.query(`
        SELECT el.exercise_log_id, el.duration_min, el.exercise_date,
               e.exercise_type, e.exercise_description
        FROM exercise_log el
        JOIN exercise e ON el.exercise_id = e.exercise_id
        WHERE el.username = $1
        ORDER BY el.exercise_date DESC
      `, [username]);
  
      res.json(result.rows);
    } catch (err) {
      console.error('Failed to fetch exercise logs:', err);
      res.status(500).json({ message: 'Server error' });
    }
  });

  server.post('/api/log-food', async (req, res) => {
    const { username, meal_type, quantity, protein, fat, carbs, calories, food_name } = req.body;
  
    if (!username || !meal_type || !quantity || !food_name) {
      return res.status(400).json({ message: 'Missing required fields' });
    }
  
    try {
      await pool.query(
        `INSERT INTO food_log 
        (username, meal_type, quantity, date, protein, fat, carbs, calories, food_name) 
        VALUES ($1, $2, $3, NOW(), $4, $5, $6, $7, $8)`,
        [username, meal_type, quantity, protein, fat, carbs, calories, food_name]
      );
  
      return res.status(201).json({ message: 'Food logged successfully' });
    } catch (err) {
      console.error('Failed to log food:', err);
      return res.status(500).json({ message: 'Server error while logging food' });
    }
  });
  

  server.get('/api/user-food/:username', async (req, res) => {
    const { username } = req.params;
  
    try {
      const result = await pool.query(
        `SELECT meal_id, meal_type, quantity, date, protein, fat, carbs, calories, food_name
         FROM food_log
         WHERE username = $1
         ORDER BY date DESC`,
        [username]
      );
  
      res.status(200).json(result.rows);
    } catch (err) {
      console.error('Failed to fetch food logs:', err);
      res.status(500).json({ message: 'Server error fetching food logs' });
    }
  });
  

  server.post('/api/profile', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    const { fname, lname, age, weight, height_ft, height_in, gender, username } = req.body;

    if (!username) {
      return res.status(400).json({message: 'Missing username'});
    }
  
    try {
      await pool.query(
        `UPDATE users 
        SET first_name = $1, last_name = $2, age = $3, gender = $4,
            weight_lb = $5, height_ft = $6, height_in = $7
        WHERE username = $8;`,
        [fname, lname, age, gender, weight, height_ft, height_in, username]
      );
  
      return res.status(200).json({ message: 'Profile updated!' }); 
    } catch (err) {
      console.error('Profile update error:', err);
      return res.status(500).json({ message: 'Internal server error' }); 
    }
  });

  server.get('/api/profile', async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
  
    try {
      const username = (req.user as any).username;
      const result = await pool.query(
        'SELECT first_name, last_name, age, gender, weight_lb, height_ft, height_in FROM users WHERE username = $1',
        [username]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Profile not found' });
      }
      
      const profile = result.rows[0];
      return res.status(200).json({
        fname: profile.first_name || '',
        lname: profile.last_name || '',
        age: profile.age || null,
        gender: profile.gender || '',
        weight: profile.weight_lb || null,
        height_ft: profile.height_ft || null,
        height_in: profile.height_in || null
      });
    } catch (err) {
      console.error('Error fetching profile:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  });

  server.delete('/api/exercise-log/:logId', async (req, res) => {
    const logId = req.params.logId;

    try {
      await pool.query(
        `DELETE FROM exercise_log WHERE exercise_log_id = $1`,
        [logId]
      );
      return res.status(201).json({ message: 'Exercise logged successfully!' });
    } catch (err) {
      console.error('Logging exercise failed:', err);
      return res.status(500).json({ message: 'Server error while logging exercise' });
    }
  });

  server.delete('/api/food-log/:mealId', async (req, res) => {
    const mealId = req.params.mealId;
  
    try {
      await pool.query('DELETE FROM food_log WHERE meal_id = $1', [mealId]);
      return res.status(200).json({ message: 'Food log deleted' });
    } catch (err) {
      console.error('Failed to delete food log:', err);
      return res.status(500).json({ message: 'Server error deleting food log' });
    }
  });
  
  function calculateBMR(gender: string, weight_lb: number, height_ft: number, height_in: number, age: number) {
    const weight_kg = weight_lb * 0.453592;
    const height_cm = ((height_ft * 12) + height_in) * 2.54;
  
    if (gender === 'male') {
      return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age + 5);
    } else if (gender === 'female') {
      return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age - 161);
    } else {
      return Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age); // fallback
    }
  }
  
  server.get('/api/summary/:username/today', async (req, res) => {
    const { username } = req.params;
    const today = new Date().toLocaleDateString('en-CA'); 

  
    try {
      const profileRes = await pool.query(
        `SELECT age, weight_lb, height_ft, height_in, gender FROM users WHERE username = $1`,
        [username]
      );

      const profile = profileRes.rows[0];
      const bmr = calculateBMR(
        profile.gender,
        profile.weight_lb,
        profile.height_ft,
        profile.height_in,
        profile.age
      );
  
      const foodRes = await pool.query(
        `SELECT SUM(calories) as total_consumed
         FROM food_log
         WHERE username = $1 AND DATE(date) = $2`,
        [username, today]
      );
  
      const exerciseRes = await pool.query(
        `SELECT SUM(calories_burned) as total_burned
         FROM exercise_log
         WHERE username = $1 AND DATE(exercise_date) = $2`,
        [username, today]
      );
  
      const caloriesConsumed = parseFloat(foodRes.rows[0].total_consumed);
      const activeCalories = parseFloat(exerciseRes.rows[0].total_burned);
      const totalCaloriesBurned = activeCalories + bmr;
      const netCalories = caloriesConsumed - totalCaloriesBurned;
  
      res.json({
        date: today,
        calories_consumed: caloriesConsumed,
        calories_burned: totalCaloriesBurned,
        net_calories: netCalories,
        resting_burn: bmr,
        active_burn: activeCalories,
        status: netCalories > 0 ? 'Surplus' : 'Deficit'
      });
    } catch (err) {
      console.error('Error generating summary:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  });
  
  server.get('/api/summary/:username/all-time', async (req, res) => {
    const { username } = req.params;
  
    try {
      const profileRes = await pool.query(
        `SELECT age, weight_lb, height_ft, height_in, gender FROM users WHERE username = $1`,
        [username]
      );
  
      const profile = profileRes.rows[0];
      const bmr = calculateBMR(
        profile.gender,
        profile.weight_lb,
        profile.height_ft,
        profile.height_in,
        profile.age
      );
  
      const foodRes = await pool.query(
        `SELECT SUM(calories) as total_consumed FROM food_log WHERE username = $1`,
        [username]
      );
  
      const exerciseRes = await pool.query(
        `SELECT SUM(calories_burned) as total_burned FROM exercise_log WHERE username = $1`,
        [username]
      );
  
      const daysLoggedRes = await pool.query(
        `SELECT COUNT(DISTINCT DATE(date)) AS days_logged FROM food_log WHERE username = $1`,
        [username]
      );
  
      const caloriesConsumed = parseFloat(foodRes.rows[0].total_consumed);
      const activeCalories = parseFloat(exerciseRes.rows[0].total_burned);
      const daysLogged = parseInt(daysLoggedRes.rows[0].days_logged || '1');
      const restingCalories = daysLogged * bmr;
  
      const totalCaloriesBurned = restingCalories + activeCalories;
      const netCalories = caloriesConsumed - totalCaloriesBurned;
  
      res.json({
        timeframe: 'All Time',
        calories_consumed: caloriesConsumed,
        calories_burned: totalCaloriesBurned,
        resting_burn: restingCalories,
        active_burn: activeCalories,
        days_logged: daysLogged,
        net_calories: netCalories,
        status: netCalories > 0 ? 'Surplus' : 'Deficit'
      });
    } catch (err) {
      console.error('Error generating all-time summary:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
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
