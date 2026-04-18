import authService from '../services/authService.js';
import APIResponse from '../utils/response.js';

class AuthController {
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json(
          APIResponse.error('VALIDATION_ERROR', 'Email is required')
        );
      }

      const result = await authService.login(email, password);
      res.json(APIResponse.success(result));
    } catch (err) {
      res.status(401).json(
        APIResponse.error('UNAUTHORIZED', 'Invalid credentials')
      );
    }
  }

  async refreshToken(req, res, next) {
    try {
      const { refresh_token } = req.body;

      if (!refresh_token) {
        return res.status(400).json(
          APIResponse.error('VALIDATION_ERROR', 'Refresh token required')
        );
      }

      const result = await authService.refreshToken(refresh_token);
      res.json(APIResponse.success(result));
    } catch (err) {
      res.status(401).json(
        APIResponse.error('INVALID_TOKEN', err.message)
      );
    }
  }
}

export default new AuthController();
