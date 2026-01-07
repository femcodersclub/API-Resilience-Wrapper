/**
 * ApiWrapper - Wrapper principal que integra todos los componentes
 * 
 * Conceptos clave:
 * - Promise.all(), Promise.race(), Promise.allSettled()
 * - Composición de promesas
 * - Manejo centralizado de errores
 */

import RetryManager from './RetryManager.js';
import TimeoutController from '../utils/TimeoutController.js';
import RateLimiter from './RateLimiter.js';
import RequestQueue from './RequestQueue.js';
import EventEmitter from '../utils/EventEmitter.js';

class ApiWrapper extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.baseURL = options.baseURL || '';
    this.defaultHeaders = options.headers || {};
    
    // Inicializar componentes
    this.retryManager = new RetryManager({
      maxRetries: options.maxRetries || 3,
      initialDelay: options.initialDelay || 1000,
      maxDelay: options.maxDelay || 30000
    });
    
    this.timeoutController = new TimeoutController(
      options.timeout || 10000
    );
    
    this.rateLimiter = new RateLimiter({
      maxRequests: options.maxRequests || 10,
      timeWindow: options.timeWindow || 1000
    });
    
    this.requestQueue = new RequestQueue({
      maxConcurrent: options.maxConcurrent || 5
    });
    
    // Métricas
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
  }

  /**
   * Método principal para hacer peticiones
   */
  async request(url, options = {}) {
    const startTime = Date.now();
    const {
      method = 'GET',
      headers = {},
      body = null,
      priority = 0,
      timeout = null,
      retry = true,
      metadata = {}
    } = options;

    this.metrics.totalRequests++;
    
    const requestMetadata = {
      url,
      method,
      ...metadata
    };

    this.emit('request:start', requestMetadata);

    try {
      // Encolar la petición con prioridad
      const result = await this.requestQueue.enqueue(
        async ({ id }) => {
          // Aplicar rate limiting
          return await this.rateLimiter.throttle(async () => {
            // Función que ejecutará el retry manager
            const executeFetch = async (attemptNumber) => {
              this.emit('request:attempt', {
                ...requestMetadata,
                attempt: attemptNumber
              });

              // Crear la petición con timeout
              const fetchWithTimeout = (signal) => {
                return fetch(this.baseURL + url, {
                  method,
                  headers: { ...this.defaultHeaders, ...headers },
                  body: body ? JSON.stringify(body) : null,
                  signal
                });
              };

              const response = await this.timeoutController.executeWithTimeout(
                fetchWithTimeout,
                timeout || this.timeoutController.defaultTimeout
              );

              if (!response.ok) {
                const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
                error.status = response.status;
                error.response = response;
                throw error;
              }

              return await response.json();
            };

            // Ejecutar con reintentos si está habilitado
            if (retry) {
              return await this.retryManager.executeWithRetry(
                executeFetch,
                requestMetadata
              );
            } else {
              return await executeFetch(0);
            }
          }, priority);
        },
        { priority, metadata: requestMetadata }
      );

      // Petición exitosa
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, true);
      
      this.emit('request:success', {
        ...requestMetadata,
        responseTime,
        result
      });

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, false);
      
      this.emit('request:error', {
        ...requestMetadata,
        responseTime,
        error: error.message
      });

      throw error;
    }
  }

  /**
   * GET request
   */
  async get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post(url, body, options = {}) {
    return this.request(url, { ...options, method: 'POST', body });
  }

  /**
   * PUT request
   */
  async put(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PUT', body });
  }

  /**
   * DELETE request
   */
  async delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }

  /**
   * Promise.all() - Ejecuta múltiples peticiones en paralelo
   * Si una falla, todas fallan
   */
  async all(requests) {
    this.emit('batch:start', { count: requests.length, type: 'all' });
    
    try {
      const results = await Promise.all(
        requests.map(req => this.request(req.url, req.options))
      );
      
      this.emit('batch:success', { count: requests.length, type: 'all' });
      return results;
      
    } catch (error) {
      this.emit('batch:error', { type: 'all', error: error.message });
      throw error;
    }
  }

  /**
   * Promise.allSettled() - Ejecuta múltiples peticiones
   * Espera a que todas terminen (éxito o fallo)
   */
  async allSettled(requests) {
    this.emit('batch:start', { count: requests.length, type: 'allSettled' });
    
    const results = await Promise.allSettled(
      requests.map(req => this.request(req.url, req.options))
    );
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    
    this.emit('batch:complete', {
      type: 'allSettled',
      total: requests.length,
      successful,
      failed
    });
    
    return results;
  }

  /**
   * Promise.race() - Retorna la primera petición que se complete
   */
  async race(requests) {
    this.emit('batch:start', { count: requests.length, type: 'race' });
    
    try {
      const result = await Promise.race(
        requests.map(req => this.request(req.url, req.options))
      );
      
      this.emit('batch:success', { type: 'race' });
      return result;
      
    } catch (error) {
      this.emit('batch:error', { type: 'race', error: error.message });
      throw error;
    }
  }

  /**
   * Promise.any() - Retorna la primera petición exitosa
   * Solo falla si todas fallan
   */
  async any(requests) {
    this.emit('batch:start', { count: requests.length, type: 'any' });
    
    try {
      const result = await Promise.any(
        requests.map(req => this.request(req.url, req.options))
      );
      
      this.emit('batch:success', { type: 'any' });
      return result;
      
    } catch (error) {
      this.emit('batch:error', { type: 'any', error: error.message });
      throw error;
    }
  }

  /**
   * Actualiza métricas
   */
  updateMetrics(responseTime, success) {
    this.metrics.responseTimes.push(responseTime);
    
    // Mantener solo las últimas 100 mediciones
    if (this.metrics.responseTimes.length > 100) {
      this.metrics.responseTimes.shift();
    }
    
    // Calcular promedio
    const sum = this.metrics.responseTimes.reduce((a, b) => a + b, 0);
    this.metrics.averageResponseTime = Math.round(
      sum / this.metrics.responseTimes.length
    );
    
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.emit('metrics:update', this.getMetrics());
  }

  /**
   * Obtiene todas las métricas y estadísticas
   */
  getMetrics() {
    return {
      ...this.metrics,
      rateLimiter: this.rateLimiter.getStats(),
      queue: this.requestQueue.getStatus(),
      timeout: this.timeoutController.getStats()
    };
  }

  /**
   * Cancela todas las peticiones activas
   */
  cancelAll() {
    this.timeoutController.abortAll();
    this.requestQueue.cancelAll();
    this.rateLimiter.clearQueue();
    
    this.emit('cancelAll');
  }

  /**
   * Resetea todas las métricas
   */
  resetMetrics() {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      retriedRequests: 0,
      averageResponseTime: 0,
      responseTimes: []
    };
    
    this.requestQueue.resetStats();
    this.emit('metrics:reset');
  }
}

export default ApiWrapper;