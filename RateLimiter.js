/**
 * RateLimiter - Control de tasa de peticiones
 * 
 * Conceptos clave:
 * - Microtasks vs Macrotasks
 * - Event Loop y Task Queue
 * - Promesas encadenadas
 */

class RateLimiter {
  constructor(options = {}) {
    this.maxRequests = options.maxRequests || 10; // peticiones
    this.timeWindow = options.timeWindow || 1000; // ms
    this.queue = [];
    this.activeRequests = 0;
    this.requestTimestamps = [];
  }

  /**
   * Limpia timestamps antiguos fuera de la ventana de tiempo
   */
  cleanOldTimestamps() {
    const now = Date.now();
    const cutoff = now - this.timeWindow;
    
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => timestamp > cutoff
    );
  }

  /**
   * Verifica si podemos hacer una nueva petición
   */
  canMakeRequest() {
    this.cleanOldTimestamps();
    return this.requestTimestamps.length < this.maxRequests;
  }

  /**
   * Calcula cuánto tiempo hay que esperar
   */
  getWaitTime() {
    if (this.requestTimestamps.length === 0) return 0;
    
    this.cleanOldTimestamps();
    
    if (this.requestTimestamps.length < this.maxRequests) return 0;
    
    // Tiempo hasta que el timestamp más antiguo salga de la ventana
    const oldestTimestamp = this.requestTimestamps[0];
    const waitTime = (oldestTimestamp + this.timeWindow) - Date.now();
    
    return Math.max(0, waitTime);
  }

  /**
   * Registra una nueva petición
   */
  recordRequest() {
    this.requestTimestamps.push(Date.now());
    this.activeRequests++;
  }

  /**
   * Marca una petición como completada
   */
  completeRequest() {
    this.activeRequests--;
    this.processQueue();
  }

  /**
   * Ejecuta una función respetando el rate limit
   */
  async throttle(fn, priority = 0) {
    // Si podemos ejecutar inmediatamente
    if (this.canMakeRequest()) {
      this.recordRequest();
      
      try {
        const result = await fn();
        return result;
      } finally {
        this.completeRequest();
      }
    }
    
    // Si no, añadir a la cola y esperar
    return new Promise((resolve, reject) => {
      this.queue.push({
        fn,
        priority,
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      // Ordenar cola por prioridad (mayor prioridad primero)
      this.queue.sort((a, b) => b.priority - a.priority);
    });
  }

  /**
   * Procesa la cola de peticiones pendientes
   * Esta función ilustra el Event Loop:
   * - Usa microtask (Promise) para scheduling
   * - Respeta el orden de prioridad
   */
  async processQueue() {
    // Si no hay items en cola o no podemos procesar, salir
    if (this.queue.length === 0 || !this.canMakeRequest()) {
      return;
    }
    
    const item = this.queue.shift();
    this.recordRequest();
    
    try {
      const result = await item.fn();
      item.resolve(result);
    } catch (error) {
      item.reject(error);
    } finally {
      this.completeRequest();
    }
  }

  /**
   * Obtiene estadísticas del rate limiter
   */
  getStats() {
    this.cleanOldTimestamps();
    
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.queue.length,
      requestsInWindow: this.requestTimestamps.length,
      availableSlots: Math.max(0, this.maxRequests - this.requestTimestamps.length),
      nextAvailableIn: this.getWaitTime()
    };
  }

  /**
   * Limpia todas las peticiones en cola
   */
  clearQueue() {
    const count = this.queue.length;
    
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    
    this.queue = [];
    
    return count;
  }
}

export default RateLimiter;