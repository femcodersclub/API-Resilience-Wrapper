/**
 * EventEmitter - Sistema simple de eventos
 * 
 * Conceptos clave:
 * - Callbacks
 * - Patrón Observer/PubSub
 */

class EventEmitter {
  constructor() {
    this.events = new Map();
  }

  /**
   * Suscribirse a un evento
   */
  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    
    this.events.get(event).push(callback);
    
    // Retornar función para desuscribirse
    return () => this.off(event, callback);
  }

  /**
   * Suscribirse a un evento solo una vez
   */
  once(event, callback) {
    const wrapper = (...args) => {
      callback(...args);
      this.off(event, wrapper);
    };
    
    return this.on(event, wrapper);
  }

  /**
   * Desuscribirse de un evento
   */
  off(event, callback) {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event);
    const index = callbacks.indexOf(callback);
    
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
    
    if (callbacks.length === 0) {
      this.events.delete(event);
    }
  }

  /**
   * Emitir un evento
   */
  emit(event, data) {
    if (!this.events.has(event)) return;
    
    const callbacks = this.events.get(event);
    
    callbacks.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Error en callback del evento '${event}':`, error);
      }
    });
  }

  /**
   * Eliminar todos los listeners de un evento
   */
  removeAllListeners(event) {
    if (event) {
      this.events.delete(event);
    } else {
      this.events.clear();
    }
  }

  /**
   * Obtener el número de listeners de un evento
   */
  listenerCount(event) {
    return this.events.has(event) ? this.events.get(event).length : 0;
  }
}

export default EventEmitter;