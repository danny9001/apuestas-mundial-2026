#!/usr/bin/env node
'use strict';

const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;

if (!email || !password) {
  console.error('ADMIN_EMAIL and ADMIN_PASSWORD env vars are required');
  process.exit(1);
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

(async () => {
  const hash = await bcrypt.hash(password, 10);
  const result = await pool.query(
    `INSERT INTO users (nombre, email, password_hash, tipo, activo, aprobado)
     VALUES ($1, $2, $3, 'admin', true, true)
     ON CONFLICT (email) DO NOTHING
     RETURNING id`,
    ['Admin', email, hash]
  );
  if (result.rowCount > 0) {
    console.log(`Admin user created: ${email} (id=${result.rows[0].id})`);
  } else {
    console.log(`Admin user already exists: ${email}`);
  }
  await pool.end();
})().catch((err) => {
  console.error('seed-admin failed:', err.message);
  process.exit(1);
});
