const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------
// PostgreSQL connection
// ---------------------
const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false } // Required for Railway
});

// Debug: confirm env vars
console.log("DB_HOST:", process.env.DB_HOST);
console.log("DB_PORT:", process.env.DB_PORT);
console.log("DB_USER:", process.env.DB_USER);
console.log("DB_NAME:", process.env.DB_NAME);

// ---------------------
// Ensure table exists
// ---------------------
const init = async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS health_check (
        id SERIAL PRIMARY KEY,
        message TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log("Table health_check is ready");
  } catch (err) {
    console.error("Error creating table:", err);
  }
};
init();

// ---------------------
// Endpoints
// ---------------------

// GET all messages / health
app.get("/health", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM health_check ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST a new message
app.post("/health", async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const result = await pool.query(
      "INSERT INTO health_check (message) VALUES ($1) RETURNING *",
      [message]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// DELETE a message
app.delete("/health/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM health_check WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Message not found" });
    res.json({ deleted: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// UPDATE a message
app.put("/health/:id", async (req, res) => {
  const { id } = req.params;
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Message is required" });

  try {
    const result = await pool.query(
      "UPDATE health_check SET message = $1 WHERE id = $2 RETURNING *",
      [message, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: "Message not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// ---------------------
// Test DB connection endpoint
// ---------------------
app.get("/db-check", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ db: "connected", time: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------------
// Start server
// ---------------------
const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server running on port ${port}`));
