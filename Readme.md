# 🚀 API Resilience Wrapper

Sistema robusto de gestión de peticiones HTTP con reintentos automáticos, rate limiting, cola de prioridades y monitoreo en tiempo real.

![Dashboard Preview](./docs/dashboard-preview.png)

## 📚 Proyecto Educativo - FemCoders Club

Este proyecto forma parte de la serie de posts técnicos sobre **JavaScript Asíncrono** de FemCoders Club. Está diseñado para ilustrar conceptos fundamentales de asincronía en JavaScript de manera práctica.

### Conceptos Ilustrados

- ✅ **Event Loop y Call Stack**: Cómo JavaScript maneja operaciones asíncronas
- ✅ **Microtasks vs Macrotasks**: Diferencias y prioridades en la cola de tareas
- ✅ **Callbacks vs Promesas vs Async/Await**: Evolución del código asíncrono
- ✅ **Promise.all(), Promise.race(), Promise.allSettled()**: Manejo de múltiples promesas
- ✅ **AbortController**: Cancelación de peticiones HTTP
- ✅ **Try/Catch en contextos asíncronos**: Manejo robusto de errores

## 🎯 Características

### Sistema de Reintentos
- ⚡ Backoff exponencial con jitter
- 🎯 Reintentos inteligentes basados en códigos de error
- ⏱️ Delays configurables y límites máximos

### Rate Limiting
- 🚦 Control de tasa de peticiones por ventana de tiempo
- 📊 Monitoreo en tiempo real de uso
- 🔄 Cola automática cuando se alcanza el límite

### Gestión de Timeouts
- ⏰ Timeouts configurables por petición
- 🛑 Cancelación manual de peticiones
- 🔍 AbortController integrado

### Cola de Prioridades
- 📋 Sistema de prioridades para peticiones
- ⚙️ Control de concurrencia configurable
- 📊 Estadísticas detalladas de cola

### Dashboard en Tiempo Real
- 📈 Métricas en vivo de rendimiento
- 🎨 Interfaz visual intuitiva
- 📝 Log detallado de peticiones
- 🎛️ Controles de prueba interactivos

## 📦 Instalación
```bash
# Clonar el repositorio
git clone https://github.com/femcodersclub/api-resilience-wrapper.git

# Navegar al directorio
cd api-resilience-wrapper

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run serve
```

Abre tu navegador en `http://localhost:3000/dashboard`

## 🚀 Uso Básico

### Inicialización
```javascript
import ApiWrapper from './src/core/ApiWrapper.js';

const api = new ApiWrapper({
  baseURL: 'https://api.example.com',
  maxRetries: 3,              // Número máximo de reintentos
  initialDelay: 1000,         // Delay inicial en ms
  timeout: 10000,             // Timeout por defecto en ms
  maxRequests: 10,            // Máximo de peticiones
  timeWindow: 1000,           // Ventana de tiempo en ms
  maxConcurrent: 5,           // Máximo de peticiones concurrentes
  headers: {
    'Authorization': 'Bearer TOKEN'
  }
});
```

### Peticiones Simples
```javascript
// GET
const user = await api.get('/users/1');

// POST
const newUser = await api.post('/users', {
  name: 'Ana García',
  email: 'ana@example.com'
});

// PUT
const updated = await api.put('/users/1', {
  name: 'Ana García López'
});

// DELETE
await api.delete('/users/1');
```

### Promise.all() - Todas deben tener éxito
```javascript
const requests = [
  { url: '/users/1' },
  { url: '/users/2' },
  { url: '/users/3' }
];

try {
  const results = await api.all(requests);
  console.log('✅ Todos los usuarios:', results);
} catch (error) {
  console.error('❌ Una o más peticiones fallaron');
}
```

### Promise.allSettled() - Espera a todas
```javascript
const requests = [
  { url: '/users/1' },
  { url: '/users/999' },  // Puede fallar
  { url: '/users/3' }
];

const results = await api.allSettled(requests);

results.forEach((result, i) => {
  if (result.status === 'fulfilled') {
    console.log(`✅ Usuario ${i + 1}:`, result.value);
  } else {
    console.log(`❌ Usuario ${i + 1} falló:`, result.reason);
  }
});
```

### Promise.race() - Primera en completarse
```javascript
// Consultar múltiples servidores, usar el más rápido
const result = await api.race([
  { url: 'https://api1.example.com/data' },
  { url: 'https://api2.example.com/data' },
  { url: 'https://api3.example.com/data' }
]);

console.log('✅ Servidor más rápido respondió:', result);
```

### Promise.any() - Primera exitosa
```javascript
// Usar el primer servidor que responda correctamente
const result = await api.any([
  { url: 'https://unreliable1.com/data' },
  { url: 'https://unreliable2.com/data' },
  { url: 'https://reliable.com/data' }
]);

console.log('✅ Primera respuesta exitosa:', result);
```

### Sistema de Prioridades
```javascript
// Petición crítica (alta prioridad)
const critical = await api.get('/user/critical', {
  priority: 10
});

// Petición normal (prioridad media)
const normal = await api.get('/user/profile', {
  priority: 5
});

// Analytics en background (baja prioridad)
api.get('/analytics/event', {
  priority: 0
}).catch(() => {
  // No nos importa si falla
});
```

### Cancelación de Peticiones
```javascript
// Iniciar petición
const promise = api.get('/large-file');

// Cancelar después de 2 segundos
setTimeout(() => {
  api.cancelAll();
}, 2000);

try {
  await promise;
} catch (error) {
  if (error.name === 'AbortError') {
    console.log('🛑 Petición cancelada');
  }
}
```

### Manejo de Errores
```javascript
try {
  const data = await api.get('/endpoint');
  console.log('✅ Datos:', data);
  
} catch (error) {
  if (error.name === 'TimeoutError') {
    console.error('⏱️ Timeout alcanzado');
  } else if (error.status === 404) {
    console.error('❌ Recurso no encontrado');
  } else if (error.status === 429) {
    console.error('🚦 Rate limit excedido');
  } else {
    console.error('❌ Error:', error.message);
  }
}
```

### Eventos y Monitoreo
```javascript
// Escuchar eventos
api.on('request:start', (data) => {
  console.log('🚀 Petición iniciada:', data.url);
});

api.on('request:success', (data) => {
  console.log(`✅ Éxito en ${data.responseTime}ms`);
});

api.on('request:error', (data) => {
  console.error('❌ Error:', data.error);
});

api.on('request:attempt', (data) => {
  console.log(`🔄 Reintento ${data.attempt}`);
});

// Obtener métricas
const metrics = api.getMetrics();
console.log('📊 Métricas:', metrics);
```

## 📖 Ejemplos Completos

Consulta el archivo `examples/usage.js` para ejemplos completos de:

- ✅ Callbacks vs Promesas vs Async/Await
- ✅ Try/Catch en contextos asíncronos
- ✅ Todos los métodos de Promise
- ✅ Casos de uso reales (Dashboard, Búsqueda, etc.)
- ✅ Event Loop: Microtasks vs Macrotasks

## 🏗️ Arquitectura
```
src/
├── core/
│   ├── ApiWrapper.js         # Wrapper principal
│   ├── RetryManager.js       # Sistema de reintentos
│   ├── RateLimiter.js        # Rate limiting
│   └── RequestQueue.js       # Cola de prioridades
├── utils/
│   ├── TimeoutController.js  # Manejo de timeouts
│   └── EventEmitter.js       # Sistema de eventos
└── dashboard/
    ├── Monitor.js            # Lógica del dashboard
    ├── index.html            # UI del dashboard
    ├── styles.css            # Estilos
    └── app.js                # Aplicación principal
```

## 🎓 Conceptos Educativos

### Event Loop

El Event Loop es el mecanismo que permite a JavaScript ejecutar código asíncrono a pesar de ser single-threaded:
```javascript
console.log('1. Código síncrono');

setTimeout(() => {
  console.log('3. Macrotask (setTimeout)');
}, 0);

Promise.resolve().then(() => {
  console.log('2. Microtask (Promise)');
});

// Orden: 1 → 2 → 3
// Las microtasks siempre se ejecutan antes que las macrotasks
```

### Call Stack

El Call Stack mantiene el registro de las funciones en ejecución:
```javascript
function tercera() {
  console.log('En tercera función');
}

function segunda() {
  tercera();
}

function primera() {
  segunda();
}

primera();

// Call Stack durante la ejecución:
// [primera] → [primera, segunda] → [primera, segunda, tercera]
```

### Microtasks vs Macrotasks
```javascript
// MICROTASKS (mayor prioridad):
// - Promise callbacks (.then, .catch, .finally)
// - queueMicrotask()
// - MutationObserver

// MACROTASKS (menor prioridad):
// - setTimeout
// - setInterval
// - setImmediate
// - I/O operations
```

### Async/Await es azúcar sintáctico para Promesas
```javascript
// Con Promesas
function getUser() {
  return fetch('/user')
    .then(response => response.json())
    .then(data => {
      console.log(data);
      return data;
    })
    .catch(error => {
      console.error(error);
      throw error;
    });
}

// Con Async/Await (más legible)
async function getUser() {
  try {
    const response = await fetch('/user');
    const data = await response.json();
    console.log(data);
    return data;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
```

## 🧪 Testing

El dashboard incluye controles interactivos para probar:

- ✅ Peticiones simples
- ✅ Peticiones en paralelo
- ✅ Sistema de prioridades
- ✅ Promise.all(), allSettled(), race(), any()
- ✅ Reintentos automáticos
- ✅ Timeouts
- ✅ Rate limiting

## 📊 Métricas Disponibles
```javascript
const metrics = api.getMetrics();

// Retorna:
{
  totalRequests: 100,
  successfulRequests: 95,
  failedRequests: 5,
  averageResponseTime: 250,
  
  rateLimiter: {
    activeRequests: 3,
    requestsInWindow: 8,
    availableSlots: 2
  },
  
  queue: {
    queued: 5,
    running: 3,
    maxConcurrent: 5
  },
  
  timeout: {
    activeRequests: 3
  }
}
```

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Este proyecto es educativo y está diseñado para la comunidad.

1. Fork el proyecto
2. Crea tu rama de feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 👥 Autores

**FemCoders Club** - *Comunidad de mujeres en tecnología*

- Website: [femcoders.club](https://femcoders.club)
- GitHub: [@femcodersclub](https://github.com/femcodersclub)

## 🙏 Agradecimientos

- A todas las mujeres de FemCoders Club por su apoyo y feedback
- A la comunidad de JavaScript por las herramientas y recursos
- A todas las desarrolladoras que están aprendiendo asincronía con este proyecto

## 📚 Recursos Adicionales

- [MDN - Asynchronous JavaScript](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous)
- [JavaScript.info - Promises, async/await](https://javascript.info/async)
- [Jake Archibald - In The Loop](https://www.youtube.com/watch?v=cCOL7MC4Pl0)
- [Blog Post en FemCoders Club](https://femcoders.club/blog/event-loop-asincronia)

---

**¿Preguntas o sugerencias?** Abre un issue o únete a nuestra comunidad en [FemCoders Club](https://femcodersclub.com
)