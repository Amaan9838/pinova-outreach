// API Wrapper — lightweight error handling for route handlers.
// errorMonitor and performanceMonitor have been removed; we now just catch and return
// a consistent error response without the dependency on deleted monitor modules.

/**
 * Wraps a Next.js route handler with consistent error handling.
 * @param {Function} handler - async (request, params) => Response
 * @param {string} endpointName - human-readable name for logging
 */
export function withErrorHandling(handler, endpointName) {
  return async (request, params) => {
    try {
      return await handler(request, params);
    } catch (error) {
      console.error(`[${endpointName}] Unhandled error:`, error);
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
