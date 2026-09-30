import * as migration_20260930_174321_initial from './20260930_174321_initial';

export const migrations = [
  {
    up: migration_20260930_174321_initial.up,
    down: migration_20260930_174321_initial.down,
    name: '20260930_174321_initial'
  },
];
