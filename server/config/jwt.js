const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'farmdhan_super_secret_jwt_key_2026_sih';
const JWT_EXPIRES_IN = '30d';

const generateToken = (userId, role) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = { generateToken, verifyToken, JWT_SECRET };
