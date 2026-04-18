import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import requestLogger from './src/middleware/requestLogger.js';
import errorHandler from './src/middleware/errorHandler.js';
import APIResponse from './src/utils/response.js';

import taskRoutes from './src/routes/tasks.js';
import authRoutes from './src/routes/auth.js';
import dashboardRoutes from './src/routes/dashboard.js';

const app = express();
const __dirname = dirname(fileURLToPath(import.meta.url));

app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:4321',
    'https://portfolio.pages.dev',
    'https://yukilabs-core.pages.dev'
  ],
  credentials: true
}));

app.use(requestLogger);

app.use('/api/tasks', taskRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

const swaggerDocument = JSON.parse(
  readFileSync(join(__dirname, 'swagger.json'), 'utf-8')
);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger UI: http://localhost:${PORT}/api-docs`);
});
