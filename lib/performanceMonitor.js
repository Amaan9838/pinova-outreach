const ErrorMonitor = require('./errorMonitor.js');

class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.thresholds = {
      api: 3000,      // 3s for API calls
      database: 2000, // 2s for DB operations
      email: 5000     // 5s for email operations
    };
  }

  // Start timing an operation
  startTimer(operationId) {
    this.metrics.set(operationId, {
      startTime: Date.now(),
      memoryStart: process.memoryUsage()
    });
  }

  // End timing and log if slow
  async endTimer(operationId, operationType = 'general', context = {}) {
    const metric = this.metrics.get(operationId);
    if (!metric) return;

    const duration = Date.now() - metric.startTime;
    const memoryEnd = process.memoryUsage();
    const memoryDelta = memoryEnd.heapUsed - metric.memoryStart.heapUsed;

    const threshold = this.thresholds[operationType] || 1000;
    
    if (duration > threshold) {
      const monitor = new ErrorMonitor();
      await monitor.logWarning(`Slow ${operationType} operation`, {
        operationId,
        duration: `${duration}ms`,
        threshold: `${threshold}ms`,
        memoryDelta: `${Math.round(memoryDelta / 1024 / 1024)}MB`,
        ...context
      });
    }

    this.metrics.delete(operationId);
    return { duration, memoryDelta };
  }

  // Wrap MongoDB operations
  static wrapDbQuery(query, operationName) {
    return async (...args) => {
      const monitor = new PerformanceMonitor();
      const operationId = `db_${operationName}_${Date.now()}`;
      
      monitor.startTimer(operationId);
      
      try {
        const result = await query(...args);
        await monitor.endTimer(operationId, 'database', { operationName });
        return result;
      } catch (error) {
        await monitor.endTimer(operationId, 'database', { operationName, error: true });
        throw error;
      }
    };
  }

  // Wrap API handlers
  static wrapApiHandler(handler, endpointName) {
    return async (req, res) => {
      const monitor = new PerformanceMonitor();
      const operationId = `api_${endpointName}_${Date.now()}`;
      
      monitor.startTimer(operationId);
      
      try {
        const result = await handler(req, res);
        await monitor.endTimer(operationId, 'api', { 
          endpoint: endpointName,
          method: req.method 
        });
        return result;
      } catch (error) {
        await monitor.endTimer(operationId, 'api', { 
          endpoint: endpointName,
          method: req.method,
          error: true 
        });
        throw error;
      }
    };
  }

  // Monitor email operations
  static async monitorEmailOperation(operation, context = {}) {
    const monitor = new PerformanceMonitor();
    const operationId = `email_${Date.now()}`;
    
    monitor.startTimer(operationId);
    
    try {
      const result = await operation();
      await monitor.endTimer(operationId, 'email', context);
      return result;
    } catch (error) {
      await monitor.endTimer(operationId, 'email', { ...context, error: true });
      throw error;
    }
  }
}

module.exports = PerformanceMonitor;
