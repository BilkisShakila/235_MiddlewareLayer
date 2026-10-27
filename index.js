import "dotenv/config";
import express from "express";
import pg from "pg";
import joi from "joi";

const app = express();
const port = process.env.PORT;

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));