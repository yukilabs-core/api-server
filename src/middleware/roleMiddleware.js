import APIResponse from '../utils/response.js';

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(APIResponse.error('UNAUTHORIZED', 'Authentication required'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json(APIResponse.error('FORBIDDEN', `Access denied. Required roles: ${allowedRoles.join(', ')}`));
    }

    next();
  };
}

export default requireRole;
