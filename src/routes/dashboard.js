import express from 'express';
import dashboardController from '../controllers/dashboardController.js';
import authMiddleware from '../middleware/auth.middleware.js';
import requireRole from '../middleware/roleMiddleware.js';

const router = express.Router();

router.get('/stats', authMiddleware, requireRole('viewer', 'editor', 'admin'), dashboardController.getStats.bind(dashboardController));

export default router;
