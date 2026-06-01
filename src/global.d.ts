import { Pool } from 'pg';
import { EventEmitter } from 'events';

declare global {
  var _postgresPool: Pool | undefined;
  var _realtimeEmitter: EventEmitter | undefined;
}

export {};
