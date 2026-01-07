/**
 * TimeoutController - Gestión de timeouts y cancelación de requests
 * 
 * Conceptos clave:
 * - AbortController y AbortSignal
 * - Promise.race() para timeouts
 * - Manejo de cancelaciones
 */

class TimeoutController {
  constructor(defaultTimeout = 10000) {
    this.defaultTimeout = defaultTimeout;
    this.activeRequests = new Map();
  }

  /**
   * Crea un controller con timeout automático
   */
  createWithTimeout(timeout = this.defaultTimeout, requestId = null) {
    const controller = new AbortController();
    const id = requestId || this.generateId();
    
    const timeoutId = setTimeout(() => {
      controller.abort();
      this.activeRequests.delete(id);
      console.warn(`⏱️ Request ${id} cancelado por timeout (${timeout}ms)`);
    }, timeout);
    
    // Guardar referencia para poder cancelar manualmente
    this.activeRequests.set(id, {
      controller,
      timeoutId,
      createdAt: Date.now()
    });
    
    return { controller, id };
  }

  /**
   * Cancela una petición específica
   */
  abort(requestId) {
    const request = this.activeRequests.get(requestId);
    
    if (request) {
      clearTimeout(request.timeoutId);
      request.controller.abort();
      this.activeRequests.delete(requestId);
      console.log(`🛑 Request ${requestId} cancelado manualmente`);
      return true;
    }
    
    return false;
  }

  /**
   * Cancela todas las peticiones activas
   */
  abortAll() {
    console.log(`🛑 Cancelando ${this.activeRequests.size} peticiones activas`);
    
    this.activeRequests.forEach((request, id) => {
      clearTimeout(request.timeoutId);
      request.controller.abort();
    });
    
    this.activeRequests.clear();
  }

  /**
   * Limpia un request completado
   */
  cleanup(requestId) {
    const request = this.activeRequests.get(requestId);
    
    if (request) {
      clearTimeout(request.timeoutId);
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Ejecuta una petición con timeout
   * Usa Promise.race() para competir entre la petición y el timeout
   */
  async executeWithTimeout(fetchPromise, timeout = this.defaultTimeout) {
    const { controller, id } = this.createWithTimeout(timeout);
    
    try {
      // Promise.race: la primera promesa que se resuelva/rechace gana
      const result = await Promise.race([
        fetchPromise(controller.signal),
        this.createTimeoutPromise(timeout)
      ]);
      
      this.cleanup(id);
      return result;
      
    } catch (error) {
      this.cleanup(id);
      
      if (error.name === 'AbortError' || error.name === 'TimeoutError') {
        const timeoutError = new Error(`Request timeout after ${timeout}ms`);
        timeoutError.name = 'TimeoutError';
        timeoutError.timeout = timeout;
        throw timeoutError;
      }
      
      throw error;
    }
  }

  /**
   * Crea una promesa que se rechaza después del timeout
   */
  createTimeoutPromise(ms) {
    return new Promise((_, reject) => {
      setTimeout(() => {
        const error = new Error(`Operation timed out after ${ms}ms`);
        error.name = 'TimeoutError';
        reject(error);
      }, ms);
    });
  }

  /**
   * Genera ID único para requests
   */
  generateId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtiene estadísticas de peticiones activas
   */
  getStats() {
    const stats = {
      activeRequests: this.activeRequests.size,
      requests: []
    };
    
    this.activeRequests.forEach((request, id) => {
      stats.requests.push({
        id,
        duration: Date.now() - request.createdAt
      });
    });
    
    return stats;
  }
}

export default TimeoutController;