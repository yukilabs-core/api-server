import { metricsService } from '../services/metricsService.js';

export const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();

  // Capture original res.json to track response
  const originalJson = res.json;
  res.json = function (data) {
    const responseTime = Date.now() - startTime;
    const endpoint = `${req.method} ${req.path}`;

    metricsService.recordRequest(req.method, endpoint, res.statusCode, responseTime);

    if (res.statusCode >= 400) {
      if (res.statusCode === 401 || res.statusCode === 403) {
        metricsService.recordTokenError();
      }
      if (data?.error) {
        metricsService.recordError(
          new Error(data.error.message || 'Unknown error'),
          res.statusCode,
          endpoint
        );
      }
    }

    return originalJson.call(this, data);
  };

  next();
};
