import jwt from 'jsonwebtoken';
import APIResponse from '../utils/response.js';

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json(
      APIResponse.error('MISSING_TOKEN', 'Authorization header required')
    );
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json(
      APIResponse.error('INVALID_TOKEN', 'Token expired or invalid')
    );
  }
}

export default authMiddleware;
