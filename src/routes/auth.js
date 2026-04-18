import express from 'express';
import authController from '../controllers/authController.js';

const router = express.Router();

router.post('/login', authController.login.bind(authController));
router.post('/refresh', authController.refreshToken.bind(authController));

export default router;
