import * as migration_20260930_174321_initial from './20260930_174321_initial';
import * as migration_20260930_190916_settings_indexable from './20260930_190916_settings_indexable';
import * as migration_20261001_012829_brand_simplified from './20261001_012829_brand_simplified';
import * as migration_20261001_092000_drafts_autosave from './20261001_092000_drafts_autosave';
import * as migration_20261003_125616_pattern_seo_fields from './20261003_125616_pattern_seo_fields';
import * as migration_20261003_230132_seo_titles from './20261003_230132_seo_titles';
import * as migration_20261003_235740_page_heading from './20261003_235740_page_heading';
import * as migration_20261004_233651_download_picture from './20261004_233651_download_picture';
import * as migration_20261006_145424_pattern_pinterest_links from './20261006_145424_pattern_pinterest_links';
import * as migration_20261009_202401_glass_controls from './20261009_202401_glass_controls';

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
    name: '20261001_012829_brand_simplified',
  },
  {
    up: migration_20261001_092000_drafts_autosave.up,
    down: migration_20261001_092000_drafts_autosave.down,
    name: '20261001_092000_drafts_autosave',
  },
  {
    up: migration_20261003_125616_pattern_seo_fields.up,
    down: migration_20261003_125616_pattern_seo_fields.down,
    name: '20261003_125616_pattern_seo_fields',
  },
  {
    up: migration_20261003_230132_seo_titles.up,
    down: migration_20261003_230132_seo_titles.down,
    name: '20261003_230132_seo_titles',
  },
  {
    up: migration_20261003_235740_page_heading.up,
    down: migration_20261003_235740_page_heading.down,
    name: '20261003_235740_page_heading',
  },
  {
    up: migration_20261004_233651_download_picture.up,
    down: migration_20261004_233651_download_picture.down,
    name: '20261004_233651_download_picture',
  },
  {
    up: migration_20261006_145424_pattern_pinterest_links.up,
    down: migration_20261006_145424_pattern_pinterest_links.down,
    name: '20261006_145424_pattern_pinterest_links',
  },
  {
    up: migration_20261009_202401_glass_controls.up,
    down: migration_20261009_202401_glass_controls.down,
    name: '20261009_202401_glass_controls'
  },
];
