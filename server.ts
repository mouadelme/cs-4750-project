import { APP_BASE_HREF } from '@angular/common';
import { CommonEngine } from '@angular/ssr';
import express from 'express';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import bootstrap from './src/main.server';
import { Pool } from 'pg';
import cors from 'cors';

// Connecting to PostgreSQL database
const pool = new Pool({
  user: 'group16',
  host: 'bastion.cs.virginia.edu',
  database: 'group16',
  password: 'D7nrA8X6',
  port: 5432,
});

export function app(): express.Express {
  const server = express();
  server.use(bodyParser.json());
  server.use(cors({
    origin: 'http://localhost:4200'
  }));
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
      res.status(201).json({ success: true });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ success: false, error: err });
    }
  });

  server.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const result = await pool.query(
        'SELECT * FROM users WHERE username = $1 AND password = $2',
        [username, password]
      );
      if (result.rows.length > 0) {
        res.json({ success: true, user: result.rows[0] });
      } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
      }
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ success: false, error: err });
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
