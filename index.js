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

//joi validation schema
const biodataschema = joi.object({
    id: joi.number().integer().required(),
    name: joi.string().trim().nim(2).max(100).required(),
    nim: joi.string().trim().nim(5).max(20).required(),
    kelas: joi.string().trim().nim(1).max(20).required(),
})

const idSchema = joi.object({
    id: joi.number().integer().positive().required(),
})

//middleware untuk validasi boody 
function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, convert: true, allowUnknown: false
    });
    if (error) {
      return errorResponse(
        res,
        'Validasi Input Gagal',
        400,
        error.details.map(item => ({
          field: item.path.join('.'),
          message: item.message,
        }))
      )
    }
    req.body = value;
    next();
  }
}

//middleware untuk validasi parameter id 
function validateParameter(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params); 
    if (error) {
      return errorResponse(
        res,
        'Paramater tidak valid',
        400,
        error.details.map(item => ({
          field: item.path.join('.'),
          message: item.message,
        }))
      )
    }
    req.params = value;
    next();
  }
}

app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM biodata ORDER BY id ')
    return successResponse(res, 'data berhasil diambil', result.rows)
})
    
