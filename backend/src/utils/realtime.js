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

export function broadcastRoomUpdate(payload = {}) {
  const data = {
    ...payload,
    timestamp: new Date().toISOString()
  };
  emitRealtimeUpdate('room:status_changed', data);
  emitRealtimeUpdate('module2:rooms', { action: 'updated', room: payload });
}

export function broadcastApprovalUpdate(payload = {}) {
  const data = {
    ...payload,
    timestamp: new Date().toISOString()
  };
  emitRealtimeUpdate('approval:update', data);
  emitRealtimeUpdate('approval:new_request', data);
}

export function onRealtimeUpdate(event, handler) {
  emitter.on(event, handler);
}
