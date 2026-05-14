// Metrics collection for production monitoring
class MetricsService {
  constructor() {
    this.startTime = Date.now();
    this.requests = {
      total: 0,
      byEndpoint: {},
      byMethod: {},
      errors: 0,
      success: 0,
    };
    this.responseTimes = [];
    this.errorLog = [];
    this.tokenErrors = 0;
  }

  recordRequest(method, endpoint, statusCode, responseTime) {
    this.requests.total++;

    // By endpoint
    if (!this.requests.byEndpoint[endpoint]) {
      this.requests.byEndpoint[endpoint] = { count: 0, errors: 0, totalTime: 0 };
    }
    this.requests.byEndpoint[endpoint].count++;
    this.requests.byEndpoint[endpoint].totalTime += responseTime;

    // By method
    if (!this.requests.byMethod[method]) {
      this.requests.byMethod[method] = 0;
    }
    this.requests.byMethod[method]++;

    // Status
    if (statusCode >= 400) {
      this.requests.errors++;
      this.requests.byEndpoint[endpoint].errors++;
    } else {
      this.requests.success++;
    }

    // Response times (keep last 1000)
    this.responseTimes.push(responseTime);
    if (this.responseTimes.length > 1000) {
      this.responseTimes.shift();
    }
  }

  recordError(error, statusCode, endpoint) {
    this.errorLog.push({
      timestamp: new Date().toISOString(),
      message: error.message,
      statusCode,
      endpoint,
      stack: error.stack?.split('\n').slice(0, 3).join('\n'),
    });

    // Keep last 100 errors
    if (this.errorLog.length > 100) {
      this.errorLog.shift();
    }
  }

  recordTokenError() {
    this.tokenErrors++;
  }

  getMetrics() {
    const avgResponseTime =
      this.responseTimes.length > 0
        ? Math.round(
            this.responseTimes.reduce((a, b) => a + b, 0) /
              this.responseTimes.length
          )
        : 0;

    const sortedTimes = [...this.responseTimes].sort((a, b) => a - b);
    const p95Index = Math.floor(sortedTimes.length * 0.95);
    const p99Index = Math.floor(sortedTimes.length * 0.99);

    const errorRate =
      this.requests.total > 0
        ? ((this.requests.errors / this.requests.total) * 100).toFixed(2)
        : 0;

    return {
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      requests: this.requests,
      responseTime: {
        avg: avgResponseTime,
        p95: sortedTimes[p95Index] || 0,
        p99: sortedTimes[p99Index] || 0,
        min: Math.min(...this.responseTimes, 0),
        max: Math.max(...this.responseTimes, 0),
      },
      errorRate: `${errorRate}%`,
      tokenErrors: this.tokenErrors,
      topEndpoints: this.getTopEndpoints(),
    };
  }

  getTopEndpoints() {
    return Object.entries(this.requests.byEndpoint)
      .map(([endpoint, stats]) => ({
        endpoint,
        requests: stats.count,
        errors: stats.errors,
        avgTime: Math.round(stats.totalTime / stats.count),
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);
  }

  getErrorStats(period = '24h') {
    const now = Date.now();
    const filterTime = period === '24h' ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

    const recentErrors = this.errorLog.filter(
      (e) => new Date(e.timestamp).getTime() > now - filterTime
    );

    const errorsByType = {};
    recentErrors.forEach((e) => {
      const type = e.statusCode >= 500 ? 'Server' : 'Client';
      errorsByType[type] = (errorsByType[type] || 0) + 1;
    });

    return {
      total: recentErrors.length,
      byType: errorsByType,
      recent: recentErrors.slice(-10).reverse(),
    };
  }

  getHealth(dbConnected = true) {
    return {
      status: dbConnected ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      database: dbConnected ? 'connected' : 'disconnected',
      memory: {
        heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      },
      requests: {
        total: this.requests.total,
        errors: this.requests.errors,
        errorRate: `${((this.requests.errors / Math.max(this.requests.total, 1)) * 100).toFixed(2)}%`,
      },
    };
  }
}

export const metricsService = new MetricsService();
