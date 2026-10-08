import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`patterns\` ADD \`pinterest_url\` text;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` ADD \`version_pinterest_url\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`cover_pattern_id\` integer REFERENCES patterns(id);`)
  await db.run(sql`CREATE INDEX \`articles_cover_pattern_idx\` ON \`articles\` (\`cover_pattern_id\`);`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_cover_pattern_id\` integer REFERENCES patterns(id);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_cover_pattern_idx\` ON \`_articles_v\` (\`version_cover_pattern_id\`);`)
  await db.run(sql`ALTER TABLE \`about\` ADD \`image_pattern_id\` integer REFERENCES patterns(id);`)
  await db.run(sql`CREATE INDEX \`about_image_pattern_idx\` ON \`about\` (\`image_pattern_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_articles\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`summary\` text,
  	\`heading\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`topic\` text,
  	\`cover_id\` integer,
  	\`body\` text,
  	\`slug\` text,
  	\`published\` text,
  	\`updated\` text,
  	\`show_ads\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_articles\`("id", "title", "summary", "heading", "seo_title", "seo_description", "topic", "cover_id", "body", "slug", "published", "updated", "show_ads", "updated_at", "created_at", "_status") SELECT "id", "title", "summary", "heading", "seo_title", "seo_description", "topic", "cover_id", "body", "slug", "published", "updated", "show_ads", "updated_at", "created_at", "_status" FROM \`articles\`;`)
  await db.run(sql`DROP TABLE \`articles\`;`)
  await db.run(sql`ALTER TABLE \`__new_articles\` RENAME TO \`articles\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`articles_cover_idx\` ON \`articles\` (\`cover_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`articles_slug_idx\` ON \`articles\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`articles_updated_at_idx\` ON \`articles\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`articles_created_at_idx\` ON \`articles\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`articles__status_idx\` ON \`articles\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__articles_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_summary\` text,
  	\`version_heading\` text,
  	\`version_seo_title\` text,
  	\`version_seo_description\` text,
  	\`version_topic\` text,
  	\`version_cover_id\` integer,
  	\`version_body\` text,
  	\`version_slug\` text,
  	\`version_published\` text,
  	\`version_updated\` text,
  	\`version_show_ads\` integer DEFAULT true,
  	\`version_updated_at\` text,
  	\`version_created_at\` text,
  	\`version__status\` text DEFAULT 'draft',
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`latest\` integer,
  	\`autosave\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__articles_v\`("id", "parent_id", "version_title", "version_summary", "version_heading", "version_seo_title", "version_seo_description", "version_topic", "version_cover_id", "version_body", "version_slug", "version_published", "version_updated", "version_show_ads", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave") SELECT "id", "parent_id", "version_title", "version_summary", "version_heading", "version_seo_title", "version_seo_description", "version_topic", "version_cover_id", "version_body", "version_slug", "version_published", "version_updated", "version_show_ads", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave" FROM \`_articles_v\`;`)
  await db.run(sql`DROP TABLE \`_articles_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__articles_v\` RENAME TO \`_articles_v\`;`)
  await db.run(sql`CREATE INDEX \`_articles_v_parent_idx\` ON \`_articles_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_cover_idx\` ON \`_articles_v\` (\`version_cover_id\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_slug_idx\` ON \`_articles_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_updated_at_idx\` ON \`_articles_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version_created_at_idx\` ON \`_articles_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_version_version__status_idx\` ON \`_articles_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_created_at_idx\` ON \`_articles_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_updated_at_idx\` ON \`_articles_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_latest_idx\` ON \`_articles_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_articles_v_autosave_idx\` ON \`_articles_v\` (\`autosave\`);`)
  await db.run(sql`CREATE TABLE \`__new_about\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`intro\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
  	\`image_id\` integer,
  	\`body\` text,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new_about\`("id", "intro", "seo_title", "seo_description", "image_id", "body", "updated_at", "created_at") SELECT "id", "intro", "seo_title", "seo_description", "image_id", "body", "updated_at", "created_at" FROM \`about\`;`)
  await db.run(sql`DROP TABLE \`about\`;`)
  await db.run(sql`ALTER TABLE \`__new_about\` RENAME TO \`about\`;`)
  await db.run(sql`CREATE INDEX \`about_image_idx\` ON \`about\` (\`image_id\`);`)
  await db.run(sql`ALTER TABLE \`patterns\` DROP COLUMN \`pinterest_url\`;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` DROP COLUMN \`version_pinterest_url\`;`)
}
