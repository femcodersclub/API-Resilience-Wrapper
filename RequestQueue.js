/**
 * RequestQueue - Cola de peticiones con sistema de prioridades
 * 
 * Conceptos clave:
 * - Task Queue y Event Loop
 * - Callbacks vs Promesas
 * - Manejo de concurrencia
 */

class RequestQueue {
  constructor(options = {}) {
    this.maxConcurrent = options.maxConcurrent || 5;
    this.queue = [];
    this.running = 0;
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };
  }

  /**
   * Añade una petición a la cola
   * @param {Function} fn - Función asíncrona a ejecutar
   * @param {Object} options - Opciones (priority, metadata, etc)
   */
  enqueue(fn, options = {}) {
    const {
      priority = 0,
      metadata = {},
      onProgress = null
    } = options;

    return new Promise((resolve, reject) => {
      const request = {
        id: this.generateId(),
        fn,
        priority,
        metadata,
        onProgress,
        resolve,
        reject,
        status: 'queued',
        queuedAt: Date.now(),
        startedAt: null,
        completedAt: null
      };

      this.queue.push(request);
      this.stats.total++;

      // Ordenar por prioridad
      this.queue.sort((a, b) => b.priority - a.priority);

      // Intentar procesar inmediatamente
      this.process();
    });
  }

  /**
   * Procesa la cola
   * Esta función ilustra el Event Loop en acción
   */
  async process() {
    // Si estamos en el límite de concurrencia o no hay items, salir
    if (this.running >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // Encontrar la siguiente petición válida (no cancelada)
    const requestIndex = this.queue.findIndex(r => r.status === 'queued');
    if (requestIndex === -1) return;

    const request = this.queue.splice(requestIndex, 1)[0];
    this.running++;
    request.status = 'running';
    request.startedAt = Date.now();

    try {
      // Ejecutar la petición
      const result = await request.fn({
        id: request.id,
        onProgress: request.onProgress
      });

      request.status = 'completed';
      request.completedAt = Date.now();
      this.stats.completed++;
      request.resolve(result);

    } catch (error) {
      request.status = 'failed';
      request.completedAt = Date.now();
      request.error = error;

      if (error.name === 'AbortError') {
        this.stats.cancelled++;
      } else {
        this.stats.failed++;
      }

      request.reject(error);

    } finally {
      this.running--;
      
      // Continuar procesando la cola
      // Usamos setImmediate (o setTimeout con 0) para ceder al Event Loop
      // Esto permite que otras tareas se ejecuten
      setTimeout(() => this.process(), 0);
    }
  }

  /**
   * Cancela una petición específica
   */
  cancel(requestId) {
    const request = this.queue.find(r => r.id === requestId);

    if (request && request.status === 'queued') {
      request.status = 'cancelled';
      const index = this.queue.indexOf(request);
      this.queue.splice(index, 1);
      
      const error = new Error('Request cancelled');
      error.name = 'AbortError';
      request.reject(error);
      
      this.stats.cancelled++;
      return true;
    }

    return false;
  }

  /**
   * Cancela todas las peticiones en cola (no las que están corriendo)
   */
  cancelAll() {
    const queuedRequests = this.queue.filter(r => r.status === 'queued');
    
    queuedRequests.forEach(request => {
      this.cancel(request.id);
    });

    return queuedRequests.length;
  }

  /**
   * Pausa el procesamiento de la cola
   */
  pause() {
    this.paused = true;
  }

  /**
   * Reanuda el procesamiento
   */
  resume() {
    this.paused = false;
    this.process();
  }

  /**
   * Obtiene el estado actual de la cola
   */
  getStatus() {
    const queued = this.queue.filter(r => r.status === 'queued');
    const running = this.queue.filter(r => r.status === 'running');

    return {
      queued: queued.length,
      running: this.running,
      maxConcurrent: this.maxConcurrent,
      stats: { ...this.stats },
      queuedItems: queued.map(r => ({
        id: r.id,
        priority: r.priority,
        queuedAt: r.queuedAt,
        metadata: r.metadata
      }))
    };
  }

  /**
   * Genera ID único
   */
  generateId() {
    return `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Limpia estadísticas
   */
  resetStats() {
    this.stats = {
      total: 0,
      completed: 0,
      failed: 0,
      cancelled: 0
    };
  }
}

export default RequestQueue;