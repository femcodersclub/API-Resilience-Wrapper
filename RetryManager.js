/**
 * RetryManager - Gestiona reintentos automáticos con backoff exponencial
 * 
 * Conceptos clave:
 * - Async/Await para control de flujo asíncrono
 * - Try/Catch en contextos asíncronos
 * - Promesas y manejo de errores
 */

class RetryManager {
  constructor(options = {}) {
    this.maxRetries = options.maxRetries || 3;
    this.initialDelay = options.initialDelay || 1000; // ms
    this.maxDelay = options.maxDelay || 30000; // ms
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.retryableErrors = options.retryableErrors || [408, 429, 500, 502, 503, 504];
  }

  /**
   * Calcula el delay con backoff exponencial
   */
  calculateDelay(attemptNumber) {
    const exponentialDelay = this.initialDelay * Math.pow(this.backoffMultiplier, attemptNumber);
    const jitter = Math.random() * 0.3 * exponentialDelay; // 30% jitter
    return Math.min(exponentialDelay + jitter, this.maxDelay);
  }

  /**
   * Determina si un error es reintentable
   */
  isRetryable(error) {
    if (error.aborted) return false; // No reintentar si fue cancelado
    
    const status = error.status || error.response?.status;
    return this.retryableErrors.includes(status);
  }

  /**
   * Ejecuta una función con reintentos automáticos
   * @param {Function} fn - Función asíncrona a ejecutar
   * @param {Object} context - Contexto adicional para logging
   */
  async executeWithRetry(fn, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        // Intento de ejecución
        const result = await fn(attempt);
        
        // Si llegamos aquí, la petición fue exitosa
        if (attempt > 0) {
          console.log(`✅ Éxito después de ${attempt} reintentos`, context);
        }
        
        return result;
        
      } catch (error) {
        lastError = error;
        
        // Si no es reintentable o es el último intento, lanzar error
        if (!this.isRetryable(error) || attempt === this.maxRetries) {
          console.error(`❌ Error final después de ${attempt} intentos:`, error.message);
          throw error;
        }
        
        // Calcular delay y esperar antes del siguiente intento
        const delay = this.calculateDelay(attempt);
        console.warn(
          `⚠️ Intento ${attempt + 1}/${this.maxRetries + 1} falló. ` +
          `Reintentando en ${Math.round(delay)}ms...`,
          { error: error.message, ...context }
        );
        
        // Esperar antes del siguiente intento
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  /**
   * Utilidad para crear delays
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default RetryManager;