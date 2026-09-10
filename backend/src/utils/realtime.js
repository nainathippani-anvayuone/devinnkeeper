import { EventEmitter } from 'events';

const emitter = new EventEmitter();
let io = null;

export function setSocketIo(socketServer) {
  io = socketServer;
}

export function getSocketIo() {
  return io;
}

export function emitRealtimeUpdate(event = 'module2:update', payload = {}) {
  if (io) {
    io.emit(event, payload);
  }
  emitter.emit(event, payload);
}

export function onRealtimeUpdate(event, handler) {
  emitter.on(event, handler);
}
