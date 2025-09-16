const fs = require('fs').promises;
const path = require('path');

class ErrorMonitor {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.initializeLogDirectory();
  }

  async initializeLogDirectory() {
    try {
      await fs.mkdir(this.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }

  async logError(error, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'ERROR',
      message: error.message,
      stack: error.stack,
      context,
      userAgent: context.req?.headers?.['user-agent'],
      url: context.req?.url,
      method: context.req?.method,
      ip: context.req?.ip || context.req?.connection?.remoteAddress
    };

    // Write to file
    const logFile = path.join(this.logDir, `error-${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      await fs.appendFile(logFile, logLine);
    } catch (writeError) {
      console.error('Failed to write error log:', writeError);
    }

    // Console output for development
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${timestamp}] ERROR:`, error.message);
      if (context.apiEndpoint) {
        console.error(`API: ${context.apiEndpoint}`);
      }
      if (error.stack) {
        console.error(error.stack);
      }
    }

    // Check for critical errors that need immediate attention
    this.checkCriticalError(error, context);
  }

  async logWarning(message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'WARNING',
      message,
      context
    };

    const logFile = path.join(this.logDir, `warning-${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Failed to write warning log:', error);
    }
  }

  async logInfo(message, context = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level: 'INFO',
      message,
      context
    };

    const logFile = path.join(this.logDir, `info-${new Date().toISOString().split('T')[0]}.log`);
    const logLine = JSON.stringify(logEntry) + '\n';
    
    try {
      await fs.appendFile(logFile, logLine);
    } catch (error) {
      console.error('Failed to write info log:', error);
    }
  }

  checkCriticalError(error, context) {
    const criticalPatterns = [
      /database.*connection/i,
      /mongodb.*error/i,
      /cast.*failed/i,
      /validation.*failed/i,
      /duplicate.*key/i,
      /timeout/i,
      /out of memory/i
    ];

    const isCritical = criticalPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.stack || '')
    );

    if (isCritical) {
      this.handleCriticalError(error, context);
    }
  }

  async handleCriticalError(error, context) {
    const alertData = {
      timestamp: new Date().toISOString(),
      error: error.message,
      stack: error.stack,
      context,
      severity: 'CRITICAL'
    };

    // Write to critical errors file
    const criticalFile = path.join(this.logDir, 'critical-errors.log');
    const alertLine = JSON.stringify(alertData) + '\n';
    
    try {
      await fs.appendFile(criticalFile, alertLine);
    } catch (writeError) {
      console.error('Failed to write critical error log:', writeError);
    }

    // In production, you would send alerts here (email, Slack, etc.)
    console.error('🚨 CRITICAL ERROR DETECTED:', error.message);
  }

  // API wrapper for consistent error handling
  static wrapApiHandler(handler) {
    return async (req, res) => {
      const monitor = new ErrorMonitor();
      
      try {
        return await handler(req, res);
      } catch (error) {
        await monitor.logError(error, {
          apiEndpoint: `${req.method} ${req.url}`,
          req: {
            url: req.url,
            method: req.method,
            headers: req.headers,
            body: req.body
          }
        });

        // Return consistent error response
        return Response.json(
          { 
            success: false, 
            error: process.env.NODE_ENV === 'development' 
              ? error.message 
              : 'Internal server error',
            timestamp: new Date().toISOString()
          },
          { status: 500 }
        );
      }
    };
  }

  // Database operation wrapper
  static async wrapDbOperation(operation, context = {}) {
    const monitor = new ErrorMonitor();
    
    try {
      return await operation();
    } catch (error) {
      await monitor.logError(error, {
        operation: 'database',
        ...context
      });
      throw error;
    }
  }

  // Performance monitoring
  static async measurePerformance(operation, name) {
    const startTime = Date.now();
    const monitor = new ErrorMonitor();
    
    try {
      const result = await operation();
      const duration = Date.now() - startTime;
      
      if (duration > 5000) { // Log slow operations (>5s)
        await monitor.logWarning(`Slow operation detected: ${name}`, {
          duration: `${duration}ms`,
          operation: name
        });
      }
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      await monitor.logError(error, {
        operation: name,
        duration: `${duration}ms`
      });
      throw error;
    }
  }

  // Get error statistics
  async getErrorStats(days = 7) {
    const stats = {
      totalErrors: 0,
      criticalErrors: 0,
      warnings: 0,
      errorsByDay: {},
      commonErrors: {}
    };

    try {
      const files = await fs.readdir(this.logDir);
      const errorFiles = files.filter(file => file.startsWith('error-'));
      
      for (const file of errorFiles) {
        const filePath = path.join(this.logDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            const day = entry.timestamp.split('T')[0];
            
            stats.totalErrors++;
            stats.errorsByDay[day] = (stats.errorsByDay[day] || 0) + 1;
            stats.commonErrors[entry.message] = (stats.commonErrors[entry.message] || 0) + 1;
          } catch (parseError) {
            // Skip malformed log entries
          }
        }
      }
    } catch (error) {
      console.error('Failed to read error stats:', error);
    }

    return stats;
  }
}

module.exports = ErrorMonitor;
