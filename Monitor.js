/**
 * Monitor - Dashboard en tiempo real
 * 
 * Conceptos clave:
 * - Event Loop en el navegador
 * - Actualización reactiva del DOM
 * - Callbacks para eventos
 */

class Monitor {
  constructor(apiWrapper, containerElement) {
    this.api = apiWrapper;
    this.container = containerElement;
    this.updateInterval = null;
    this.requestLog = [];
    this.maxLogEntries = 50;
    
    this.init();
  }

  init() {
    this.createUI();
    this.attachListeners();
    this.startAutoUpdate();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="monitor-dashboard">
        <div class="monitor-header">
          <h2>🎯 API Resilience Monitor</h2>
          <div class="monitor-actions">
            <button id="resetMetrics" class="btn btn-secondary">Reset Métricas</button>
            <button id="cancelAll" class="btn btn-danger">Cancelar Todo</button>
          </div>
        </div>
        
        <div class="metrics-grid">
          <!-- Métricas generales -->
          <div class="metric-card">
            <h3>📊 Peticiones Totales</h3>
            <div class="metric-value" id="totalRequests">0</div>
          </div>
          
          <div class="metric-card success">
            <h3>✅ Exitosas</h3>
            <div class="metric-value" id="successfulRequests">0</div>
            <div class="metric-percentage" id="successRate">0%</div>
          </div>
          
          <div class="metric-card error">
            <h3>❌ Fallidas</h3>
            <div class="metric-value" id="failedRequests">0</div>
            <div class="metric-percentage" id="errorRate">0%</div>
          </div>
          
          <div class="metric-card">
            <h3>⚡ Tiempo Promedio</h3>
            <div class="metric-value" id="avgResponseTime">0ms</div>
          </div>
        </div>

        <!-- Cola de peticiones -->
        <div class="queue-section">
          <h3>📋 Estado de la Cola</h3>
          <div class="queue-stats">
            <div class="stat">
              <span class="stat-label">En Cola:</span>
              <span class="stat-value" id="queuedRequests">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">Ejecutando:</span>
              <span class="stat-value" id="runningRequests">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">Concurrencia Máx:</span>
              <span class="stat-value" id="maxConcurrent">0</span>
            </div>
          </div>
        </div>

        <!-- Rate Limiter -->
        <div class="rate-limiter-section">
          <h3>🚦 Rate Limiter</h3>
          <div class="rate-stats">
            <div class="stat">
              <span class="stat-label">Peticiones Activas:</span>
              <span class="stat-value" id="activeRequests">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">En Ventana de Tiempo:</span>
              <span class="stat-value" id="requestsInWindow">0</span>
            </div>
            <div class="stat">
              <span class="stat-label">Slots Disponibles:</span>
              <span class="stat-value" id="availableSlots">0</span>
            </div>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" id="rateLimitProgress"></div>
          </div>
        </div>

        <!-- Log de peticiones -->
        <div class="request-log-section">
          <h3>📝 Log de Peticiones (últimas ${this.maxLogEntries})</h3>
          <div class="request-log" id="requestLog"></div>
        </div>
      </div>
    `;
  }

  attachListeners() {
    // Listeners de botones
    document.getElementById('resetMetrics').addEventListener('click', () => {
      this.api.resetMetrics();
      this.requestLog = [];
      this.updateUI();
    });

    document.getElementById('cancelAll').addEventListener('click', () => {
      this.api.cancelAll();
    });

    // Listeners de eventos del API
    this.api.on('request:start', (data) => {
      this.addLogEntry('info', `🚀 Iniciando: ${data.method} ${data.url}`, data);
    });

    this.api.on('request:success', (data) => {
      this.addLogEntry('success', `✅ Éxito: ${data.method} ${data.url} (${data.responseTime}ms)`, data);
    });

    this.api.on('request:error', (data) => {
      this.addLogEntry('error', `❌ Error: ${data.method} ${data.url} - ${data.error}`, data);
    });

    this.api.on('request:attempt', (data) => {
      if (data.attempt > 0) {
        this.addLogEntry('warning', `🔄 Reintento ${data.attempt}: ${data.method} ${data.url}`, data);
      }
    });

    this.api.on('batch:start', (data) => {
      this.addLogEntry('info', `📦 Batch ${data.type} iniciado: ${data.count} peticiones`, data);
    });

    this.api.on('batch:complete', (data) => {
      this.addLogEntry('info', `📦 Batch completado: ${data.successful}/${data.total} exitosas`, data);
    });
  }

  addLogEntry(type, message, data) {
    const entry = {
      type,
      message,
      timestamp: new Date().toLocaleTimeString(),
      data
    };

    this.requestLog.unshift(entry);

    // Limitar el tamaño del log
    if (this.requestLog.length > this.maxLogEntries) {
      this.requestLog.pop();
    }

    this.updateLog();
  }

  updateLog() {
    const logContainer = document.getElementById('requestLog');
    
    logContainer.innerHTML = this.requestLog.map(entry => `
      <div class="log-entry log-${entry.type}">
        <span class="log-time">${entry.timestamp}</span>
        <span class="log-message">${entry.message}</span>
      </div>
    `).join('');
  }

  startAutoUpdate() {
    // Actualizar cada 500ms
    this.updateInterval = setInterval(() => {
      this.updateUI();
    }, 500);
  }

  stopAutoUpdate() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }

  updateUI() {
    const metrics = this.api.getMetrics();

    // Métricas generales
    document.getElementById('totalRequests').textContent = metrics.totalRequests;
    document.getElementById('successfulRequests').textContent = metrics.successfulRequests;
    document.getElementById('failedRequests').textContent = metrics.failedRequests;
    document.getElementById('avgResponseTime').textContent = `${metrics.averageResponseTime}ms`;

    // Porcentajes
    const successRate = metrics.totalRequests > 0
      ? Math.round((metrics.successfulRequests / metrics.totalRequests) * 100)
      : 0;
    const errorRate = metrics.totalRequests > 0
      ? Math.round((metrics.failedRequests / metrics.totalRequests) * 100)
      : 0;

    document.getElementById('successRate').textContent = `${successRate}%`;
    document.getElementById('errorRate').textContent = `${errorRate}%`;

    // Cola
    document.getElementById('queuedRequests').textContent = metrics.queue.queued;
    document.getElementById('runningRequests').textContent = metrics.queue.running;
    document.getElementById('maxConcurrent').textContent = metrics.queue.maxConcurrent;

    // Rate Limiter
    document.getElementById('activeRequests').textContent = metrics.rateLimiter.activeRequests;
    document.getElementById('requestsInWindow').textContent = metrics.rateLimiter.requestsInWindow;
    document.getElementById('availableSlots').textContent = metrics.rateLimiter.availableSlots;

    // Barra de progreso del rate limiter
    const rateLimiterUsage = metrics.rateLimiter.requestsInWindow / 
      (metrics.rateLimiter.requestsInWindow + metrics.rateLimiter.availableSlots) * 100;
    
    const progressBar = document.getElementById('rateLimitProgress');
    progressBar.style.width = `${rateLimiterUsage}%`;
    
    // Color según uso
    if (rateLimiterUsage > 80) {
      progressBar.className = 'progress-fill danger';
    } else if (rateLimiterUsage > 50) {
      progressBar.className = 'progress-fill warning';
    } else {
      progressBar.className = 'progress-fill success';
    }
  }

  destroy() {
    this.stopAutoUpdate();
    this.api.removeAllListeners();
  }
}

export default Monitor;