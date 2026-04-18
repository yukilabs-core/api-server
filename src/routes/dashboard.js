import express from 'express';
import dashboardController from '../controllers/dashboardController.js';

const router = express.Router();

router.get('/stats', dashboardController.getStats.bind(dashboardController));

export default router;
