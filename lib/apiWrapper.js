const ErrorMonitor = require('./errorMonitor.js');
const PerformanceMonitor = require('./performanceMonitor.js');

// Enhanced API wrapper with automatic error handling and performance monitoring
function withErrorHandling(handler, endpointName) {
  return async (request, params) => {
    const monitor = new ErrorMonitor();
    const perfMonitor = new PerformanceMonitor();
    const operationId = `${endpointName}_${Date.now()}`;
    
    perfMonitor.startTimer(operationId);
    
    try {
      // Add request context for better debugging
      const context = {
        endpoint: endpointName,
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString()
      };

      const result = await handler(request, params);
      
      await perfMonitor.endTimer(operationId, 'api', context);
      await monitor.logInfo(`API Success: ${endpointName}`, context);
      
      return result;
      
    } catch (error) {
      await perfMonitor.endTimer(operationId, 'api', { 
        endpoint: endpointName, 
        error: true 
      });
      
      await monitor.logError(error, {
        endpoint: endpointName,
        method: request.method,
        url: request.url,
        params: params
      });

      // Return consistent error format
      return Response.json(
        { 
          success: false, 
          error: process.env.NODE_ENV === 'development' 
            ? error.message 
            : 'Internal server error',
          timestamp: new Date().toISOString(),
          endpoint: endpointName
        },
        { status: 500 }
      );
    }
  };
}

// Database operation wrapper with validation
function withDbValidation(operation, modelName) {
  return async (...args) => {
    const monitor = new ErrorMonitor();
    
    try {
      return await PerformanceMonitor.wrapDbQuery(operation, modelName)(...args);
    } catch (error) {
      // Enhanced error context for database operations
      if (error.name === 'ValidationError') {
        const validationErrors = Object.keys(error.errors).map(key => ({
          field: key,
          message: error.errors[key].message,
          value: error.errors[key].value
        }));
        
        await monitor.logError(error, {
          operation: 'database_validation',
          model: modelName,
          validationErrors
        });
        
        throw new Error(`Validation failed for ${modelName}: ${validationErrors.map(e => e.message).join(', ')}`);
      }
      
      if (error.name === 'CastError') {
        await monitor.logError(error, {
          operation: 'database_cast',
          model: modelName,
          path: error.path,
          value: error.value,
          kind: error.kind
        });
        
        throw new Error(`Invalid data type for ${error.path}: expected ${error.kind}, got ${typeof error.value}`);
      }
      
      throw error;
    }
  };
}

module.exports = { withErrorHandling, withDbValidation };
