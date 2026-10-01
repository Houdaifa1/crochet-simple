import * as migration_20260930_174321_initial from './20260930_174321_initial';
import * as migration_20260930_190916_settings_indexable from './20260930_190916_settings_indexable';
import * as migration_20261001_012829_brand_simplified from './20261001_012829_brand_simplified';

export const migrations = [
  {
    up: migration_20260930_174321_initial.up,
    down: migration_20260930_174321_initial.down,
    name: '20260930_174321_initial',
  },
  {
    up: migration_20260930_190916_settings_indexable.up,
    down: migration_20260930_190916_settings_indexable.down,
    name: '20260930_190916_settings_indexable',
  },
  {
    up: migration_20261001_012829_brand_simplified.up,
    down: migration_20261001_012829_brand_simplified.down,
    name: '20261001_012829_brand_simplified'
  },
];
