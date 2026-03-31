import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_dev_secret';

/**
 * Genera un JWT para un usuario autenticado.
 * @param {Object} user - Datos del usuario (id, email, first_name)
 * @returns {string} Token JWT
 */
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      name: user.first_name 
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

/**
 * Middleware de autenticación.
 * Verifica el header Authorization: Bearer <token>
 * Si es válido, agrega req.user con los datos del JWT.
 */
export function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      success: false, 
      error: 'Token de autenticación requerido.' 
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        error: 'Sesión expirada. Iniciá sesión nuevamente.' 
      });
    }
    return res.status(401).json({ 
      success: false, 
      error: 'Token inválido.' 
    });
  }
}
