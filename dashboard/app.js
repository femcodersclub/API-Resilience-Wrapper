/**
 * app.js - Aplicación principal del dashboard
 */

import ApiWrapper from '../ApiWrapper.js';
import Monitor from '../Monitor.js';

// Inicializar el API Wrapper
const api = new ApiWrapper({
  baseURL: '',
  maxRetries: 3,
  timeout: 5000,
  maxRequests: 10,
  timeWindow: 1000,
  maxConcurrent: 5
});

// Inicializar el Monitor
const monitorContainer = document.getElementById('monitorContainer');
const monitor = new Monitor(api, monitorContainer);

// ============================================================================
// CONTROLADORES DE PRUEBA
// ============================================================================

/**
 * Petición simple
 */
document.getElementById('testSingleRequest').addEventListener('click', async () => {
  try {
    const result = await api.get('https://jsonplaceholder.typicode.com/posts/1');
    console.log('✅ Petición simple exitosa:', result);
  } catch (error) {
    console.error('❌ Error en petición simple:', error);
  }
});

/**
 * Múltiples peticiones paralelas
 */
document.getElementById('testMultipleRequests').addEventListener('click', async () => {
  try {
    const requests = Array.from({ length: 10 }, (_, i) => ({
      url: `https://jsonplaceholder.typicode.com/posts/${i + 1}`,
      options: { metadata: { test: 'multiple-requests' } }
    }));

    const results = await api.allSettled(requests);
    console.log('✅ Peticiones múltiples completadas:', results);
  } catch (error) {
    console.error('❌ Error en peticiones múltiples:', error);
  }
});

/**
 * Petición con alta prioridad
 */
document.getElementById('testHighPriority').addEventListener('click', async () => {
  try {
    // Primero saturamos con peticiones lentas de baja prioridad
    for (let i = 0; i < 5; i++) {
      api.get('https://httpbin.org/delay/3', {
        priority: 0,
        metadata: { test: 'low-priority' }
      });
    }

    // Luego enviamos una de alta prioridad que debería ejecutarse primero
    const result = await api.get('https://jsonplaceholder.typicode.com/posts/1', {
      priority: 10,
      metadata: { test: 'high-priority' }
    });

    console.log('✅ Petición de alta prioridad completada:', result);
  } catch (error) {
    console.error('❌ Error en petición de alta prioridad:', error);
  }
});

/**
 * Promise.all() - Todas deben tener éxito
 */
document.getElementById('testPromiseAll').addEventListener('click', async () => {
  try {
    const requests = [
      { url: 'https://jsonplaceholder.typicode.com/posts/1' },
      { url: 'https://jsonplaceholder.typicode.com/posts/2' },
      { url: 'https://jsonplaceholder.typicode.com/posts/3' }
    ];

    const results = await api.all(requests);
    console.log('✅ Promise.all completado:', results);
  } catch (error) {
    console.error('❌ Promise.all falló:', error);
  }
});

/**
 * Promise.allSettled() - Espera todas (éxito o fallo)
 */
document.getElementById('testPromiseAllSettled').addEventListener('click', async () => {
  const requests = [
    { url: 'https://jsonplaceholder.typicode.com/posts/1' },
    { url: 'https://httpbin.org/status/500', options: { retry: false } }, // Fallará
    { url: 'https://jsonplaceholder.typicode.com/posts/3' }
  ];

  const results = await api.allSettled(requests);
  console.log('✅ Promise.allSettled completado:', results);
});

/**
 * Promise.race() - Primera en completarse
 */
document.getElementById('testPromiseRace').addEventListener('click', async () => {
  try {
    const requests = [
      { url: 'https://httpbin.org/delay/2' },
      { url: 'https://httpbin.org/delay/1' }, // Esta ganará
      { url: 'https://httpbin.org/delay/3' }
    ];

    const result = await api.race(requests);
    console.log('✅ Promise.race ganador:', result);
  } catch (error) {
    console.error('❌ Promise.race falló:', error);
  }
});

/**
 * Promise.any() - Primera exitosa
 */
document.getElementById('testPromiseAny').addEventListener('click', async () => {
  try {
    const requests = [
      { url: 'https://httpbin.org/status/500', options: { retry: false } }, // Fallará
      { url: 'https://jsonplaceholder.typicode.com/posts/1' }, // Esta ganará
      { url: 'https://httpbin.org/delay/3' }
    ];

    const result = await api.any(requests);
    console.log('✅ Promise.any ganador:', result);
  } catch (error) {
    console.error('❌ Promise.any falló (todas fallaron):', error);
  }
});

/**
 * Test de Reintentos
 */
document.getElementById('testRetry').addEventListener('click', async () => {
  try {
    // Esta URL retorna 500 que es reintentable
    const result = await api.get('https://httpbin.org/status/500', {
      metadata: { test: 'retry' }
    });
    console.log('✅ Petición con reintentos exitosa:', result);
  } catch (error) {
    console.error('❌ Petición falló después de reintentos:', error);
  }
});

/**
 * Test de Timeout
 */
document.getElementById('testTimeout').addEventListener('click', async () => {
  try {
    // Delay de 10 segundos con timeout de 2 segundos
    const result = await api.get('https://httpbin.org/delay/10', {
      timeout: 2000,
      retry: false,
      metadata: { test: 'timeout' }
    });
    console.log('✅ Petición completada:', result);
  } catch (error) {
    console.error('❌ Timeout como esperado:', error);
  }
});

/**
 * Test de Rate Limit
 */
document.getElementById('testRateLimit').addEventListener('click', async () => {
  try {
    // Enviar 20 peticiones rápidamente para saturar el rate limiter
    const requests = Array.from({ length: 20 }, (_, i) => 
      api.get(`https://jsonplaceholder.typicode.com/posts/${i + 1}`, {
        metadata: { test: 'rate-limit', index: i }
      })
    );

    console.log('🚀 Enviando 20 peticiones para saturar rate limiter...');
    await Promise.all(requests);
    console.log('✅ Todas las peticiones completadas (rate limited)');
  } catch (error) {
    console.error('❌ Error en test de rate limit:', error);
  }
});

/**
 * Test de endpoint personalizado
 */
document.getElementById('testCustomEndpoint').addEventListener('click', async () => {
  const endpoint = document.getElementById('apiEndpoint').value;
  
  if (!endpoint) {
    alert('Por favor ingresa una URL');
    return;
  }

  try {
    const result = await api.get(endpoint);
    console.log('✅ Petición a endpoint personalizado exitosa:', result);
    alert('Petición exitosa! Revisa la consola para ver el resultado.');
  } catch (error) {
    console.error('❌ Error en endpoint personalizado:', error);
    alert(`Error: ${error.message}`);
  }
});

// ============================================================================
// UTILIDADES GLOBALES
// ============================================================================

// Exponer API globalmente para debugging en consola
window.api = api;
window.monitor = monitor;

console.log(`
🎯 API Resilience Wrapper Dashboard
====================================
El objeto 'api' está disponible en la consola para pruebas.

Ejemplos:
  api.get('https://jsonplaceholder.typicode.com/posts/1')
  api.post('https://jsonplaceholder.typicode.com/posts', { title: 'Test' })
  api.getMetrics()
  api.cancelAll()

¡Usa los botones de la interfaz para probar diferentes escenarios!
`);