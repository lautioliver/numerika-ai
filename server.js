import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import { query } from './src/config/db.js';

const app = express();

app.use(helmet());

// --- MIDDLEWARES ---

// 1. Lectura de JSON (SIN ESTO req.body ESTÁ VACÍO)
app.use(express.json()); 

// 2. Configuración de CORS corregida para Express 5
app.use(cors({
    origin: 'https://numerika-ai.vercel.app', // Permite todo temporalmente para asegurar que conecte
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- RUTAS ---

app.get('/', (req, res) => {
    res.send("NumerikaAI API is running... 🚀");
});

app.post('/api/auth/register', async (req, res) => {
    const { firstName, lastName, email, password, institution, role } = req.body;

    if (!firstName || !email || !password) {
        return res.status(400).json({ 
            success: false, 
            error: "Faltan completar campos obligatorios" 
        });
    }

    try {
        const saltRounds = 10;
        const hash = await bcrypt.hash(password, saltRounds);

        const sql = `
            INSERT INTO users (first_name, last_name, email, password_hash, institution, role) 
            VALUES ($1, $2, $3, $4, $5, $6) 
            RETURNING id, email, first_name
        `;
        const params = [firstName, lastName, email, hash, institution, role];
        const result = await query(sql, params);

        res.status(201).json({ 
            success: true, 
            message: "¡Usuario creado con éxito!", 
            user: result.rows[0] 
        });

    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, error: "El email ya está registrado." });
        }
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Usuario no encontrado." });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Contraseña incorrecta." });
        }

        res.json({ 
            success: true, 
            message: `¡Hola de nuevo, ${user.first_name}!`,
            user: { id: user.id, email: user.email, name: user.first_name }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: "Error en el servidor." });
    }
});

const PORT = process.env.PORT || 3000; 

app.listen(PORT, () => {
    console.log(`🚀 Servidor de NumerikaAI encendido en el puerto: ${PORT}`);
});