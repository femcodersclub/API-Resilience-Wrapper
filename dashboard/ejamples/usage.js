/**
 * usage.js - Ejemplos de uso del API Resilience Wrapper
 * 
 * Este archivo demuestra todos los conceptos clave:
 * - Callbacks vs Promesas vs Async/Await
 * - Promise.all(), Promise.race(), Promise.allSettled()
 * - Manejo de errores con try/catch
 * - AbortController y cancelaciones
 * - Event Loop y asincronía
 */

import ApiWrapper from '../../ApiWrapper.js';

// ============================================================================
// EJEMPLO 1: Configuración Básica
// ============================================================================

const api = new ApiWrapper({
  baseURL: 'https://api.example.com',
  
  // Configuración de reintentos
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  
  // Configuración de timeout
  timeout: 10000,
  
  // Configuración de rate limiting
  maxRequests: 10,
  timeWindow: 1000, // 10 peticiones por segundo
  
  // Configuración de cola
  maxConcurrent: 5,
  
  // Headers por defecto
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

// ============================================================================
// EJEMPLO 2: Peticiones Simples - Async/Await vs Promesas vs Callbacks
// ============================================================================

// ❌ Estilo antiguo: Callbacks (NO recomendado)
function fetchUserOldStyle(userId, callback) {
  // Este es el estilo antiguo con callbacks
  // Propenso a "callback hell"
  fetch(`https://api.example.com/users/${userId}`)
    .then(response => response.json())
    .then(data => callback(null, data))
    .catch(error => callback(error, null));
}

// ✅ Estilo moderno: Promesas
function fetchUserWithPromise(userId) {
  return api.get(`/users/${userId}`)
    .then(data => {
      console.log('Usuario obtenido:', data);
      return data;
    })
    .catch(error => {
      console.error('Error obteniendo usuario:', error);
      throw error;
    });
}

// ✅✅ Estilo más moderno: Async/Await (RECOMENDADO)
async function fetchUserWithAsync(userId) {
  try {
    const data = await api.get(`/users/${userId}`);
    console.log('Usuario obtenido:', data);
    return data;
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    throw error;
  }
}

// ============================================================================
// EJEMPLO 3: Try/Catch en Contextos Asíncronos
// ============================================================================

/**
 * Manejo de errores con try/catch en async/await
 */
async function handleErrorsExample() {
  try {
    // Try/catch captura errores síncronos y asíncronos
    const user = await api.get('/users/123');
    const posts = await api.get(`/users/${user.id}/posts`);
    
    console.log(`Usuario ${user.name} tiene ${posts.length} posts`);
    
  } catch (error) {
    // Aquí capturamos cualquier error de las peticiones anteriores
    if (error.name === 'TimeoutError') {
      console.error('⏱️ La petición tardó demasiado');
    } else if (error.status === 404) {
      console.error('❌ Usuario no encontrado');
    } else if (error.status === 429) {
      console.error('🚦 Demasiadas peticiones, intenta más tarde');
    } else {
      console.error('❌ Error inesperado:', error.message);
    }
  }
}

/**
 * Try/catch anidados para manejo granular
 */
async function nestedTryCatchExample() {
  try {
    const user = await api.get('/users/123');
    
    try {
      // Intentamos obtener posts, pero si falla continuamos
      const posts = await api.get(`/users/${user.id}/posts`);
      console.log('Posts obtenidos:', posts);
    } catch (postsError) {
      console.warn('No se pudieron obtener posts, continuando...');
      // No relanzamos el error, continuamos con el flujo
    }
    
    // Este código se ejecuta incluso si falló obtener los posts
    console.log('Procesando usuario:', user);
    
  } catch (error) {
    console.error('Error crítico obteniendo usuario:', error);
  }
}

// ============================================================================
// EJEMPLO 4: Promise.all() - Todas deben tener éxito
// ============================================================================

/**
 * Promise.all() ejecuta todas las promesas en paralelo
 * Si UNA falla, TODAS fallan
 */
async function promiseAllExample() {
  try {
    console.log('🚀 Ejecutando peticiones en paralelo con Promise.all()...');
    
    // Todas se ejecutan en paralelo, esperamos a que todas terminen
    const [user, posts, comments] = await Promise.all([
      api.get('/users/1'),
      api.get('/posts'),
      api.get('/comments')
    ]);
    
    console.log('✅ Todas las peticiones exitosas');
    console.log('Usuario:', user);
    console.log('Posts:', posts.length);
    console.log('Comentarios:', comments.length);
    
  } catch (error) {
    // Si una falla, caemos aquí inmediatamente
    console.error('❌ Una o más peticiones fallaron:', error);
  }
}

/**
 * Promise.all() con el wrapper
 */
async function promiseAllWithWrapperExample() {
  try {
    const requests = [
      { url: '/users/1' },
      { url: '/users/2' },
      { url: '/users/3' }
    ];
    
    const results = await api.all(requests);
    console.log('✅ Todos los usuarios obtenidos:', results);
    
  } catch (error) {
    console.error('❌ Error en Promise.all:', error);
  }
}

// ============================================================================
// EJEMPLO 5: Promise.allSettled() - Espera a todas sin importar errores
// ============================================================================

/**
 * Promise.allSettled() espera a que todas terminen
 * No importa si algunas fallan
 */
async function promiseAllSettledExample() {
  console.log('🚀 Ejecutando peticiones con Promise.allSettled()...');
  
  const results = await Promise.allSettled([
    api.get('/users/1'),
    api.get('/users/999'), // Esta probablemente falle (404)
    api.get('/users/3')
  ]);
  
  // Procesamos los resultados
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      console.log(`✅ Petición ${index + 1} exitosa:`, result.value);
    } else {
      console.error(`❌ Petición ${index + 1} falló:`, result.reason);
    }
  });
  
  // Filtrar solo las exitosas
  const successful = results
    .filter(r => r.status === 'fulfilled')
    .map(r => r.value);
  
  console.log(`📊 ${successful.length}/${results.length} peticiones exitosas`);
}

/**
 * Promise.allSettled() con el wrapper
 */
async function promiseAllSettledWithWrapperExample() {
  const requests = [
    { url: '/users/1' },
    { url: '/users/999', options: { retry: false } }, // Fallará
    { url: '/users/3' }
  ];
  
  const results = await api.allSettled(requests);
  
  // El wrapper ya maneja el logging, pero podemos procesar los resultados
  const successful = results.filter(r => r.status === 'fulfilled');
  console.log(`✅ ${successful.length} peticiones exitosas`);
}

// ============================================================================
// EJEMPLO 6: Promise.race() - La primera en completarse gana
// ============================================================================

/**
 * Promise.race() retorna la primera promesa que se resuelva o rechace
 * Útil para timeouts personalizados o servidores redundantes
 */
async function promiseRaceExample() {
  try {
    console.log('🏁 Iniciando race entre múltiples endpoints...');
    
    // Consultamos el mismo recurso a diferentes servidores
    const result = await Promise.race([
      api.get('https://api1.example.com/data'),
      api.get('https://api2.example.com/data'),
      api.get('https://api3.example.com/data')
    ]);
    
    console.log('✅ Primer servidor en responder:', result);
    
  } catch (error) {
    // Si la primera en terminar fue un error
    console.error('❌ El servidor más rápido falló:', error);
  }
}

/**
 * Promise.race() para timeout personalizado
 */
async function raceWithTimeoutExample() {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Timeout personalizado')), 3000);
  });
  
  try {
    const result = await Promise.race([
      api.get('/slow-endpoint'),
      timeoutPromise
    ]);
    
    console.log('✅ Petición completada antes del timeout:', result);
    
  } catch (error) {
    console.error('⏱️ Timeout alcanzado:', error);
  }
}

// ============================================================================
// EJEMPLO 7: Promise.any() - Primera exitosa gana
// ============================================================================

/**
 * Promise.any() retorna la primera promesa EXITOSA
 * Solo falla si TODAS fallan
 */
async function promiseAnyExample() {
  try {
    console.log('🎯 Buscando la primera respuesta exitosa...');
    
    const result = await Promise.any([
      api.get('https://unreliable-api1.com/data'), // Puede fallar
      api.get('https://unreliable-api2.com/data'), // Puede fallar
      api.get('https://reliable-api.com/data')     // Probablemente funcione
    ]);
    
    console.log('✅ Primera respuesta exitosa:', result);
    
  } catch (error) {
    // Solo llegamos aquí si TODAS fallaron
    console.error('❌ Todos los endpoints fallaron:', error);
  }
}

// ============================================================================
// EJEMPLO 8: AbortController y Cancelación de Peticiones
// ============================================================================

/**
 * Cancelar una petición individual
 */
async function abortSingleRequestExample() {
  // El wrapper maneja AbortController internamente
  const requestPromise = api.get('/large-file', {
    metadata: { requestId: 'download-1' }
  });
  
  // Cancelar después de 2 segundos
  setTimeout(() => {
    api.timeoutController.abortAll();
    console.log('🛑 Petición cancelada');
  }, 2000);
  
  try {
    await requestPromise;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('✅ Petición cancelada correctamente');
    }
  }
}

/**
 * Cancelar múltiples peticiones
 */
async function abortMultipleRequestsExample() {
  // Iniciar varias peticiones
  const requests = [
    api.get('/endpoint1'),
    api.get('/endpoint2'),
    api.get('/endpoint3')
  ];
  
  // Cancelar todas después de 1 segundo
  setTimeout(() => {
    api.cancelAll();
    console.log('🛑 Todas las peticiones canceladas');
  }, 1000);
  
  const results = await Promise.allSettled(requests);
  
  results.forEach((result, i) => {
    if (result.status === 'rejected' && result.reason.name === 'AbortError') {
      console.log(`Petición ${i + 1} fue cancelada`);
    }
  });
}

// ============================================================================
// EJEMPLO 9: Sistema de Prioridades
// ============================================================================

/**
 * Peticiones con diferentes prioridades
 */
async function priorityExample() {
  console.log('🎯 Enviando peticiones con diferentes prioridades...');
  
  // Peticiones de baja prioridad (ej: analytics)
  for (let i = 0; i < 5; i++) {
    api.get('/analytics/event', {
      priority: 0,
      metadata: { type: 'analytics', index: i }
    });
  }
  
  // Petición de alta prioridad (ej: datos críticos del usuario)
  const criticalData = await api.get('/user/critical-data', {
    priority: 10,
    metadata: { type: 'critical' }
  });
  
  console.log('✅ Datos críticos obtenidos primero:', criticalData);
}

// ============================================================================
// EJEMPLO 10: Monitoreo y Eventos
// ============================================================================

/**
 * Escuchar eventos del wrapper
 */
function monitoringExample() {
  // Evento cuando una petición inicia
  api.on('request:start', (data) => {
    console.log('🚀 Petición iniciada:', data.url);
  });
  
  // Evento cuando una petición tiene éxito
  api.on('request:success', (data) => {
    console.log(`✅ Petición exitosa: ${data.url} (${data.responseTime}ms)`);
  });
  
  // Evento cuando una petición falla
  api.on('request:error', (data) => {
    console.error(`❌ Petición falló: ${data.url} - ${data.error}`);
  });
  
  // Evento cuando se reintenta una petición
  api.on('request:attempt', (data) => {
    if (data.attempt > 0) {
      console.log(`🔄 Reintentando petición: ${data.url} (intento ${data.attempt})`);
    }
  });
  
  // Evento cuando se ejecuta un batch
  api.on('batch:start', (data) => {
    console.log(`📦 Batch ${data.type} iniciado: ${data.count} peticiones`);
  });
  
  // Evento cuando se actualizan las métricas
  api.on('metrics:update', (metrics) => {
    console.log('📊 Métricas actualizadas:', metrics);
  });
}

// ============================================================================
// EJEMPLO 11: Caso de Uso Real - Dashboard de Usuario
// ============================================================================

/**
 * Cargar dashboard de usuario con datos de múltiples endpoints
 */
async function loadUserDashboard(userId) {
  console.log(`📊 Cargando dashboard para usuario ${userId}...`);
  
  try {
    // 1. Primero obtenemos datos críticos del usuario (alta prioridad)
    const user = await api.get(`/users/${userId}`, {
      priority: 10,
      metadata: { critical: true }
    });
    
    console.log('✅ Datos del usuario cargados');
    
    // 2. Luego cargamos datos secundarios en paralelo
    const [posts, followers, settings] = await Promise.allSettled([
      api.get(`/users/${userId}/posts`, { priority: 5 }),
      api.get(`/users/${userId}/followers`, { priority: 3 }),
      api.get(`/users/${userId}/settings`, { priority: 5 })
    ]);
    
    // 3. Procesar resultados
    const dashboard = {
      user,
      posts: posts.status === 'fulfilled' ? posts.value : [],
      followers: followers.status === 'fulfilled' ? followers.value : [],
      settings: settings.status === 'fulfilled' ? settings.value : {}
    };
    
    // 4. Cargar analytics en background (baja prioridad)
    api.get(`/analytics/user/${userId}`, {
      priority: 0,
      metadata: { background: true }
    }).catch(() => {
      // No nos importa si falla
      console.log('Analytics no disponible, continuando...');
    });
    
    console.log('✅ Dashboard cargado completamente');
    return dashboard;
    
  } catch (error) {
    console.error('❌ Error cargando dashboard:', error);
    throw error;
  }
}

// ============================================================================
// EJEMPLO 12: Caso de Uso Real - Búsqueda con Debounce
// ============================================================================

/**
 * Búsqueda con cancelación de peticiones anteriores
 */
class SearchManager {
  constructor(api) {
    this.api = api;
    this.currentSearch = null;
  }
  
  async search(query) {
    // Cancelar búsqueda anterior si existe
    if (this.currentSearch) {
      this.api.cancelAll();
    }
    
    if (!query || query.length < 3) {
      return [];
    }
    
    try {
      this.currentSearch = this.api.get('/search', {
        priority: 8,
        metadata: { query, type: 'search' }
      });
      
      const results = await this.currentSearch;
      this.currentSearch = null;
      
      return results;
      
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Búsqueda anterior cancelada');
        return [];
      }
      throw error;
    }
  }
}

// Uso:
const searchManager = new SearchManager(api);

// Simular usuario escribiendo
setTimeout(() => searchManager.search('j'), 0);
setTimeout(() => searchManager.search('ja'), 100);
setTimeout(() => searchManager.search('jav'), 200);
setTimeout(() => searchManager.search('java'), 300); // Solo esta se ejecutará

// ============================================================================
// EJEMPLO 13: Microtasks vs Macrotasks
// ============================================================================

/**
 * Demostración del Event Loop: Microtasks vs Macrotasks
 */
function eventLoopExample() {
  console.log('1. Script start (Synchronous)');
  
  // Macrotask (setTimeout)
  setTimeout(() => {
    console.log('5. setTimeout callback (Macrotask)');
  }, 0);
  
  // Microtask (Promise)
  Promise.resolve().then(() => {
    console.log('3. Promise callback (Microtask)');
  });
  
  // Microtask anidado
  Promise.resolve().then(() => {
    console.log('4. Nested Promise (Microtask)');
    
    // Otro macrotask
    setTimeout(() => {
      console.log('7. Nested setTimeout (Macrotask)');
    }, 0);
  });
  
  console.log('2. Script end (Synchronous)');
  
  // Otro macrotask
  setTimeout(() => {
    console.log('6. Another setTimeout (Macrotask)');
  }, 0);
}

// Orden de ejecución:
// 1. Script start
// 2. Script end
// 3. Promise callback (todas las microtasks se ejecutan primero)
// 4. Nested Promise
// 5. setTimeout callback (luego las macrotasks)
// 6. Another setTimeout
// 7. Nested setTimeout

// ============================================================================
// EJECUTAR EJEMPLOS
// ============================================================================

async function runExamples() {
  console.log('🚀 Iniciando ejemplos del API Resilience Wrapper\n');
  
  // Descomentar para ejecutar diferentes ejemplos:
  
  // await handleErrorsExample();
  // await promiseAllExample();
  // await promiseAllSettledExample();
  // await promiseRaceExample();
  // await promiseAnyExample();
  // await priorityExample();
  // await loadUserDashboard(123);
  // eventLoopExample();
  
  console.log('\n✅ Ejemplos completados');
}

// Ejecutar si se importa como módulo
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    api,
    runExamples,
    loadUserDashboard,
    SearchManager
  };
}

// Ejecutar si se carga directamente
if (typeof window !== 'undefined') {
  window.apiExamples = {
    api,
    runExamples,
    loadUserDashboard,
    SearchManager
  };
}