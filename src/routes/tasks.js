import express from 'express';
import taskController from '../controllers/taskController.js';
import authMiddleware from '../middleware/auth.middleware.js';

const router = express.Router();

router.get('/', taskController.getTasks.bind(taskController));
router.get('/:task_id', taskController.getTask.bind(taskController));
router.post('/', authMiddleware, taskController.createTask.bind(taskController));
router.patch('/:task_id/status', authMiddleware, taskController.updateTaskStatus.bind(taskController));

export default router;
