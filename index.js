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


// Middleware Logging
app.use((req, res, next) => {
  const start = Date.now()

  res.on('finish', () => {
    const duration = Date.now() - start
    console.log({
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration} ms`
    })
  })
  next()
})

//response envelope
function successResponse(res, data, status = 200) {
    return res.status(status).json({
        status: true, message, data, error: null,
    })
}

function errorResponse(res, message, status, details = null) {
    return res.status(status).json({
        status: false, message, data: null, error: details,
    })
}
