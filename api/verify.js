const crypto = require('crypto');

module.exports = function handler(req, res) {
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

  const { token } = body || {};

  if (!token || typeof token !== 'string') {
    return res.status(401).json({ success: false, valid: false });
  }

  const parts = token.split(':');
  if (parts.length !== 3) {
    return res.status(401).json({ success: false, valid: false });
  }

  const [username, timestampStr, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  // Expiración: 7 días
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
  if (Date.now() - timestamp > MAX_AGE_MS) {
    return res.status(401).json({ success: false, valid: false, error: 'Sesión expirada' });
  }

  const secret = process.env.SESSION_SECRET || 'secret_mini_video_2026';
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${username}:${timestamp}`)
    .digest('hex');

  if (signature === expectedSig) {
    return res.status(200).json({ success: true, valid: true, username });
  }

  return res.status(401).json({ success: false, valid: false });
};
