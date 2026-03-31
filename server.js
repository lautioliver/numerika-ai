import 'dotenv/config'; 
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';
import helmet from 'helmet';
import { query } from './src/config/db.js';
import { generateToken, authMiddleware } from './src/middleware/auth.js';
import { generateExplanation, checkRateLimit, chatWithIka } from './src/services/ai.js';

const app = express();

app.use(helmet());

// --- MIDDLEWARES ---

// 1. Lectura de JSON
app.use(express.json()); 

// 2. Configuración de CORS
app.use(cors({
    origin: ['https://numerika-ai.vercel.app', 'http://localhost:5173'], 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// --- RUTAS PÚBLICAS ---

app.get('/', (req, res) => {
    res.send("NumerikaAI API is running... 🚀");
});

// ── REGISTER ──────────────────────────────────────────────────────────────────
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
        const user = result.rows[0];

        // Generar JWT
        const token = generateToken(user);

        res.status(201).json({ 
            success: true, 
            message: "¡Usuario creado con éxito!", 
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.first_name 
            }
        });

    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ success: false, error: "El email ya está registrado." });
        }
        console.error("Error en register:", err.message);
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

// ── LOGIN ─────────────────────────────────────────────────────────────────────
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

        // Generar JWT
        const token = generateToken(user);

        res.json({ 
            success: true, 
            message: `¡Hola de nuevo, ${user.first_name}!`,
            token,
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.first_name 
            }
        });
    } catch (err) {
        console.error("Error en login:", err.message);
        res.status(500).json({ success: false, error: "Error en el servidor." });
    }
});

// ── VERIFICAR SESIÓN (Token) ──────────────────────────────────────────────────
// El frontend usa esto al cargar la app para validar que el token guardado siga vigente
app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const result = await query(
            'SELECT id, email, first_name FROM users WHERE id = $1', 
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: "Usuario no encontrado." });
        }

        const user = result.rows[0];
        res.json({ 
            success: true, 
            user: { 
                id: user.id, 
                email: user.email, 
                name: user.first_name 
            }
        });
    } catch (err) {
        console.error("Error en /me:", err.message);
        res.status(500).json({ success: false, error: "Error en el servidor." });
    }
});

// --- RUTAS PROTEGIDAS (ejemplo para futuras features) ---
// app.post('/api/calculations', authMiddleware, async (req, res) => { ... });

// --- IA ---

// ── EXPLICACIÓN IA ────────────────────────────────────────────────────────────
app.post('/api/ai/explain', async (req, res) => {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ 
            success: false, 
            error: "Demasiadas solicitudes. Esperá un momento antes de pedir otra explicación." 
        });
    }

    const { method, methodId, funcExpr, params, result } = req.body;

    if (!method || !funcExpr || !result) {
        return res.status(400).json({ 
            success: false, 
            error: "Faltan datos del cálculo para generar la explicación." 
        });
    }

    try {
        const explanation = await generateExplanation({ 
            method, methodId, funcExpr, params, result 
        });
        
        res.json({ success: true, explanation });
    } catch (err) {
        console.error("Error en /api/ai/explain:", err.message);
        
        if (err.message.includes("GEMINI_API_KEY")) {
            return res.status(503).json({ 
                success: false, 
                error: "El servicio de IA no está configurado aún." 
            });
        }
        
        res.status(500).json({ 
            success: false, 
            error: "No se pudo generar la explicación. Intentá de nuevo." 
        });
    }
});

// ── OBTENER HISTORIAL IKA ─────────────────────────────────────────────────────
app.get('/api/ai/chat/history', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const result = await query(
            'SELECT role, content FROM ika_chats WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [userId]
        );
        // Re-ordenar cronológicamente (la query trae los más recientes primero)
        result.rows.reverse();
        res.json({ success: true, history: result.rows });
    } catch (err) {
        console.error("Error obteniendo historial:", err);
        res.status(500).json({ success: false, error: "Error en el servidor." });
    }
});

// ── ENVIAR MENSAJE A IKA ──────────────────────────────────────────────────────
app.post('/api/ai/chat', authMiddleware, async (req, res) => {
    const clientIp = req.ip || req.connection?.remoteAddress || 'unknown';
    
    // Podemos usar un rate limiter más permisivo para el chat o el mismo
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ 
            success: false, 
            error: "Demasiadas peticiones. IKA necesita tomar un vasito de agua, intentá en un minuto." 
        });
    }

    const { message, context } = req.body;
    const userId = req.user.id;

    if (!message) {
        return res.status(400).json({ success: false, error: "Mensaje vacío." });
    }

    try {
        // 1. Guardar mensaje del usuario en la base de datos
        await query(
            'INSERT INTO ika_chats (user_id, role, content) VALUES ($1, $2, $3)',
            [userId, 'user', message]
        );

        // 2. Obtener el historial COMPLETO de este usuario para la sesión con IKA
        const historyResult = await query(
            'SELECT role, content FROM ika_chats WHERE user_id = $1 ORDER BY created_at DESC LIMIT 60',
            [userId]
        );
        // Re-ordenar cronológicamente
        historyResult.rows.reverse();
        
        // Removemos el último mensaje que acabamos de meter para mandarlo aparte, 
        // o se lo dejamos al historial para que IKA ya lo procese si usamos el backend de Vertex.
        // Pero nuestra función chatWithIka espera 'history' y luego llama a sendMessage(message),
        // así que el historial NO debe incluir el mensaje actual.
        const history = historyResult.rows.slice(0, -1);

        // 3. Generar la respuesta via Gemini
        const reply = await chatWithIka(message, context || "Sin contexto", history);

        // 4. Guardar la respuesta de IKA en la BD
        await query(
            'INSERT INTO ika_chats (user_id, role, content) VALUES ($1, $2, $3)',
            [userId, 'model', reply]
        );

        res.json({ success: true, reply });

    } catch (err) {
        console.error("Error en chat de IKA:", err.message);
        res.status(500).json({ success: false, error: "IKA no pudo procesar este mensaje." });
    }
});

const PORT = process.env.PORT || 3000; 

app.listen(PORT, () => {
    console.log(`🚀 Servidor de NumerikaAI encendido en el puerto: ${PORT}`);
});