const crypto = require('crypto');

module.exports = function handler(req, res) {
  // Configurar headers CORS básicos
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const { username, password } = body || {};

  // Leer credenciales de las variables de entorno de Vercel
  const expectedUser = process.env.APP_USER;
  const expectedPassword = process.env.APP_PASSWORD;

  // Validación: si no están configuradas en Vercel, devolver aviso claro
  if (!expectedUser || !expectedPassword) {
    return res.status(500).json({
      success: false,
      error: 'Variables de entorno APP_USER o APP_PASSWORD no configuradas en Vercel.'
    });
  }

  // Comparación segura
  if (username === expectedUser && password === expectedPassword) {
    // Generar token firmado con timestamp
    const secret = process.env.SESSION_SECRET || 'secret_mini_video_2026';
    const timestamp = Date.now();
    const signature = crypto
      .createHmac('sha256', secret)
      .update(`${username}:${timestamp}`)
      .digest('hex');

    const token = `${username}:${timestamp}:${signature}`;

    return res.status(200).json({
      success: true,
      token,
      username
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Usuario o contraseña incorrectos'
  });
};
