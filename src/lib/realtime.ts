import { EventEmitter } from 'events';

if (!global._realtimeEmitter) {
  global._realtimeEmitter = new EventEmitter();
  // Set unlimited listeners since there might be many client browser connections
  global._realtimeEmitter.setMaxListeners(0);
}

export const realtimeEmitter = global._realtimeEmitter;

export function broadcastUpdate(type: 'match' | 'leaderboard' | 'goal' | 'notification' | 'settings' | 'chat' | 'reaction', data: any) {
  realtimeEmitter.emit('update', {
    type,
    data,
    timestamp: new Date().toISOString()
  });
}
