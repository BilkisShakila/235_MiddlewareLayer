import "dotenv/config";
import express from "express";
import pg from "pg";
import joi from "joi";

const app = express();
const port = process.env.PORT;
const { Pool } = pg;

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// middleware logging
app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log({
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            duration: `${duration}ms`
        });
    });
    next();
});

// response envelope
function successResponse(res, message, data = null, status = 200) {
    return res.status(status).json({
        success: true, message, data, error: null,
    });
}

function errorResponse(res, message, status = 500, details = null) {
    return res.status(status).json({
        success: false, message, data: null, error: details,
    });
}

// joi validation schema
const biodataSchema = joi.object({
    id: joi.number().integer().positive(),
    nama: joi.string().trim().min(2).max(100).required(),
    nim: joi.string().trim().min(5).max(20).required(),
    kelas: joi.string().trim().min(1).max(20).required(),
});

const idSchema = joi.object({
    id: joi.number().integer().positive().required(),
});

// middleware untuk validasi body
function validateBody(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.body, {
            abortEarly: false, convert: true, allowUnknown: false
        });
        if (error) {
            return errorResponse(res, 'validasi input gagal', 400, error.details.map(item => ({
                field: item.path.join('.'),
                message: item.message
            })));
        }
        req.validatedBody = value;
        next();
    };
}

// middleware untuk validasi parameter id
function validateParams(schema) {
    return (req, res, next) => {
        const { error, value } = schema.validate(req.params, {
            abortEarly: false, convert: true, allowUnknown: false
        });
        if (error) {
            return errorResponse(res, 'parameter tidak valid', 400, error.details.map(item => ({
                field: item.path.join('.'),
                message: item.message
            })));
        }
        req.validatedParams = value;
        next();
    };
}

app.get('/', async (req, res) => {
    const result = await pool.query('SELECT * FROM biodata ORDER BY id');
    return successResponse(res, 'Data berhasil diambil', result.rows);
});

app.post('/biodata', validateBody(biodataSchema), async (req, res) => {
    const { id, nama, nim, kelas } = req.body;
    const result = await pool.query(
        `INSERT INTO biodata (id, nama, nim, kelas)
        VALUES ($1, $2, $3, $4)
        RETURNING *`,
        [id ?? null, nama, nim, kelas]
    );
    return successResponse(res, 'Data berhasil ditambahkan', result.rows[0], 201);
});

app.put(
    '/biodata/:id',
    validateParams(idSchema),
    validateBody(
        biodataSchema
            .fork(["nama", "nim", "kelas"], (field) => field.required())
            .fork(["id"], (field) => field.forbidden())
    ),
    async (req, res) => {
        const { id } = req.params;
        const { nama, nim, kelas } = req.body;

        const result = await pool.query(
            `UPDATE biodata SET nama=$1, nim=$2, kelas=$3 
            WHERE id=$4 RETURNING *`,
            [nama, nim, kelas, id]
        );

        if (result.rowCount === 0) {
            return errorResponse(res, 'Data tidak ditemukan', 404);
        }

        return successResponse(res, 'Data berhasil diupdate', result.rows[0]);
    }
);

app.delete('/biodata/:id', validateParams(idSchema), async (req, res) => {
    const { id } = req.params;
    const result = await pool.query(
        'DELETE FROM biodata WHERE id=$1 RETURNING *',
        [id]
    );
    if (result.rowCount === 0) {
        return errorResponse(res, 'Data tidak ditemukan', 404);
    }
    return successResponse(res, 'Data berhasil dihapus', result.rows[0]);
});

// if route tidak ditemukan
app.use((req, res) => {
    return errorResponse(res, 'endpoint tidak ditemukan', 404);
});

// global error handler
app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) {
        return next(err);
    }
    return errorResponse(res, 'Terjadi kesalahan pada server', 500);
});

app.listen(port, () => {
    console.log(`App running on port ${port}`);
});