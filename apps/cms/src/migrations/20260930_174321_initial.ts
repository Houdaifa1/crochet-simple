import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite';

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`patterns_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`patterns\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`patterns_gallery_order_idx\` ON \`patterns_gallery\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`patterns_gallery_parent_id_idx\` ON \`patterns_gallery\` (\`_parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`patterns_gallery_image_idx\` ON \`patterns_gallery\` (\`image_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`patterns\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`summary\` text,
  	\`category_id\` integer,
  	\`cover_id\` integer,
  	\`pin_image_id\` integer,
  	\`pdf_id\` integer,
  	\`pdf_pages\` numeric,
  	\`etsy_url\` text,
  	\`details_hook\` text,
  	\`details_yarn\` text,
  	\`details_size\` text,
  	\`body\` text,
  	\`slug\` text,
  	\`published\` text,
  	\`updated\` text,
  	\`show_ads\` integer DEFAULT true,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`_status\` text DEFAULT 'draft',
  	FOREIGN KEY (\`category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`pin_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`pdf_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`patterns_category_idx\` ON \`patterns\` (\`category_id\`);`);
  await db.run(sql`CREATE INDEX \`patterns_cover_idx\` ON \`patterns\` (\`cover_id\`);`);
  await db.run(sql`CREATE INDEX \`patterns_pin_image_idx\` ON \`patterns\` (\`pin_image_id\`);`);
  await db.run(sql`CREATE INDEX \`patterns_pdf_idx\` ON \`patterns\` (\`pdf_id\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`patterns_slug_idx\` ON \`patterns\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`patterns_updated_at_idx\` ON \`patterns\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`patterns_created_at_idx\` ON \`patterns\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`patterns__status_idx\` ON \`patterns\` (\`_status\`);`);
  await db.run(sql`CREATE TABLE \`_patterns_v_version_gallery\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`image_id\` integer,
  	\`_uuid\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`_patterns_v\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_gallery_order_idx\` ON \`_patterns_v_version_gallery\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_gallery_parent_id_idx\` ON \`_patterns_v_version_gallery\` (\`_parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_gallery_image_idx\` ON \`_patterns_v_version_gallery\` (\`image_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`_patterns_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_summary\` text,
  	\`version_category_id\` integer,
  	\`version_cover_id\` integer,
  	\`version_pin_image_id\` integer,
  	\`version_pdf_id\` integer,
  	\`version_pdf_pages\` numeric,
  	\`version_etsy_url\` text,
  	\`version_details_hook\` text,
  	\`version_details_yarn\` text,
  	\`version_details_size\` text,
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
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`patterns\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_pin_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_pdf_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`_patterns_v_parent_idx\` ON \`_patterns_v\` (\`parent_id\`);`);
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_version_category_idx\` ON \`_patterns_v\` (\`version_category_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_version_cover_idx\` ON \`_patterns_v\` (\`version_cover_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_version_pin_image_idx\` ON \`_patterns_v\` (\`version_pin_image_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_version_pdf_idx\` ON \`_patterns_v\` (\`version_pdf_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_version_slug_idx\` ON \`_patterns_v\` (\`version_slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_version_updated_at_idx\` ON \`_patterns_v\` (\`version_updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_version_created_at_idx\` ON \`_patterns_v\` (\`version_created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_version_version__status_idx\` ON \`_patterns_v\` (\`version__status\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_created_at_idx\` ON \`_patterns_v\` (\`created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_patterns_v_updated_at_idx\` ON \`_patterns_v\` (\`updated_at\`);`,
  );
  await db.run(sql`CREATE INDEX \`_patterns_v_latest_idx\` ON \`_patterns_v\` (\`latest\`);`);
  await db.run(sql`CREATE TABLE \`categories\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`slug\` text,
  	\`description\` text,
  	\`icon_id\` integer,
  	\`order\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`icon_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE UNIQUE INDEX \`categories_slug_idx\` ON \`categories\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`categories_icon_idx\` ON \`categories\` (\`icon_id\`);`);
  await db.run(sql`CREATE INDEX \`categories_updated_at_idx\` ON \`categories\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`categories_created_at_idx\` ON \`categories\` (\`created_at\`);`);
  await db.run(sql`CREATE TABLE \`articles\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`summary\` text,
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
  `);
  await db.run(sql`CREATE INDEX \`articles_cover_idx\` ON \`articles\` (\`cover_id\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`articles_slug_idx\` ON \`articles\` (\`slug\`);`);
  await db.run(sql`CREATE INDEX \`articles_updated_at_idx\` ON \`articles\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`articles_created_at_idx\` ON \`articles\` (\`created_at\`);`);
  await db.run(sql`CREATE INDEX \`articles__status_idx\` ON \`articles\` (\`_status\`);`);
  await db.run(sql`CREATE TABLE \`_articles_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_summary\` text,
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
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`_articles_v_parent_idx\` ON \`_articles_v\` (\`parent_id\`);`);
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version_cover_idx\` ON \`_articles_v\` (\`version_cover_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version_slug_idx\` ON \`_articles_v\` (\`version_slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version_updated_at_idx\` ON \`_articles_v\` (\`version_updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version_created_at_idx\` ON \`_articles_v\` (\`version_created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_articles_v_version_version__status_idx\` ON \`_articles_v\` (\`version__status\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_articles_v_created_at_idx\` ON \`_articles_v\` (\`created_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`_articles_v_updated_at_idx\` ON \`_articles_v\` (\`updated_at\`);`,
  );
  await db.run(sql`CREATE INDEX \`_articles_v_latest_idx\` ON \`_articles_v\` (\`latest\`);`);
  await db.run(sql`CREATE TABLE \`media\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`alt\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`url\` text,
  	\`thumbnail_u_r_l\` text,
  	\`filename\` text,
  	\`mime_type\` text,
  	\`filesize\` numeric,
  	\`width\` numeric,
  	\`height\` numeric,
  	\`focal_x\` numeric,
  	\`focal_y\` numeric
  );
  `);
  await db.run(sql`CREATE INDEX \`media_updated_at_idx\` ON \`media\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`media_created_at_idx\` ON \`media\` (\`created_at\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`media_filename_idx\` ON \`media\` (\`filename\`);`);
  await db.run(sql`CREATE TABLE \`users_sessions\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`created_at\` text,
  	\`expires_at\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(sql`CREATE INDEX \`users_sessions_order_idx\` ON \`users_sessions\` (\`_order\`);`);
  await db.run(
    sql`CREATE INDEX \`users_sessions_parent_id_idx\` ON \`users_sessions\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`users\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`email\` text,
  	\`username\` text NOT NULL,
  	\`reset_password_token\` text,
  	\`reset_password_expiration\` text,
  	\`salt\` text,
  	\`hash\` text,
  	\`reset_password_requested_at\` text,
  	\`login_attempts\` numeric DEFAULT 0,
  	\`lock_until\` text
  );
  `);
  await db.run(sql`CREATE INDEX \`users_updated_at_idx\` ON \`users\` (\`updated_at\`);`);
  await db.run(sql`CREATE INDEX \`users_created_at_idx\` ON \`users\` (\`created_at\`);`);
  await db.run(sql`CREATE UNIQUE INDEX \`users_username_idx\` ON \`users\` (\`username\`);`);
  await db.run(sql`CREATE TABLE \`payload_kv\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text NOT NULL,
  	\`data\` text NOT NULL
  );
  `);
  await db.run(sql`CREATE UNIQUE INDEX \`payload_kv_key_idx\` ON \`payload_kv\` (\`key\`);`);
  await db.run(sql`CREATE TABLE \`payload_locked_documents\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`global_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_global_slug_idx\` ON \`payload_locked_documents\` (\`global_slug\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_updated_at_idx\` ON \`payload_locked_documents\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_created_at_idx\` ON \`payload_locked_documents\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`patterns_id\` integer,
  	\`categories_id\` integer,
  	\`articles_id\` integer,
  	\`media_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`patterns_id\`) REFERENCES \`patterns\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`articles_id\`) REFERENCES \`articles\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_patterns_id_idx\` ON \`payload_locked_documents_rels\` (\`patterns_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_categories_id_idx\` ON \`payload_locked_documents_rels\` (\`categories_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_articles_id_idx\` ON \`payload_locked_documents_rels\` (\`articles_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`payload_preferences\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`key\` text,
  	\`value\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_preferences_key_idx\` ON \`payload_preferences\` (\`key\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_updated_at_idx\` ON \`payload_preferences\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_created_at_idx\` ON \`payload_preferences\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`payload_preferences_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_preferences\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_order_idx\` ON \`payload_preferences_rels\` (\`order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_parent_idx\` ON \`payload_preferences_rels\` (\`parent_id\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_path_idx\` ON \`payload_preferences_rels\` (\`path\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_preferences_rels_users_id_idx\` ON \`payload_preferences_rels\` (\`users_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`payload_migrations\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text,
  	\`batch\` numeric,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `);
  await db.run(
    sql`CREATE INDEX \`payload_migrations_updated_at_idx\` ON \`payload_migrations\` (\`updated_at\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`payload_migrations_created_at_idx\` ON \`payload_migrations\` (\`created_at\`);`,
  );
  await db.run(sql`CREATE TABLE \`homepage_products\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`description\` text NOT NULL,
  	\`tags\` text,
  	\`alt\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`homepage\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`homepage_products_order_idx\` ON \`homepage_products\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`homepage_products_parent_id_idx\` ON \`homepage_products\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`homepage\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`seo_title\` text DEFAULT 'Crochet Simple | Crochet patterns and tutorials' NOT NULL,
  	\`seo_description\` text DEFAULT 'Follow one thread as it becomes seven crochet designs, then find clear crochet patterns, tutorials and notes from the studio.' NOT NULL,
  	\`headline\` text DEFAULT 'Every piece begins with' NOT NULL,
  	\`headline_accent\` text DEFAULT 'one thread.' NOT NULL,
  	\`cue\` text DEFAULT 'Scroll to follow the thread' NOT NULL,
  	\`ending_eyebrow\` text DEFAULT 'Crochet Simple' NOT NULL,
  	\`ending_title\` text DEFAULT 'One thread.' NOT NULL,
  	\`ending_accent\` text DEFAULT 'Endless things to make.' NOT NULL,
  	\`ending_text\` text DEFAULT 'Clear patterns, step by step tutorials and notes from the studio.' NOT NULL,
  	\`primary_button\` text DEFAULT 'Browse patterns' NOT NULL,
  	\`secondary_button\` text DEFAULT 'Read the journal' NOT NULL,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `);
  await db.run(sql`CREATE TABLE \`listings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`patterns_eyebrow\` text DEFAULT 'Crochet patterns' NOT NULL,
  	\`patterns_title\` text DEFAULT 'Patterns' NOT NULL,
  	\`patterns_intro\` text DEFAULT 'Clear steps, good photos and a finished piece you will actually use.' NOT NULL,
  	\`patterns_seo_description\` text,
  	\`journal_eyebrow\` text DEFAULT 'Notes from the studio' NOT NULL,
  	\`journal_title\` text DEFAULT 'Journal' NOT NULL,
  	\`journal_intro\` text DEFAULT 'Tutorials, yarn notes and the stories behind each design.' NOT NULL,
  	\`journal_seo_description\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `);
  await db.run(sql`CREATE TABLE \`about\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`intro\` text,
  	\`image_id\` integer,
  	\`body\` text,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(sql`CREATE INDEX \`about_image_idx\` ON \`about\` (\`image_id\`);`);
  await db.run(sql`CREATE TABLE \`privacy\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`body\` text,
  	\`updated\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `);
  await db.run(sql`CREATE TABLE \`terms\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`body\` text,
  	\`updated\` text,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `);
  await db.run(sql`CREATE TABLE \`settings_social\` (
  	\`_order\` integer NOT NULL,
  	\`_parent_id\` integer NOT NULL,
  	\`id\` text PRIMARY KEY NOT NULL,
  	\`platform\` text NOT NULL,
  	\`url\` text NOT NULL,
  	FOREIGN KEY (\`_parent_id\`) REFERENCES \`settings\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `);
  await db.run(
    sql`CREATE INDEX \`settings_social_order_idx\` ON \`settings_social\` (\`_order\`);`,
  );
  await db.run(
    sql`CREATE INDEX \`settings_social_parent_id_idx\` ON \`settings_social\` (\`_parent_id\`);`,
  );
  await db.run(sql`CREATE TABLE \`settings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`site_url\` text,
  	\`contact_email\` text,
  	\`pinterest_url\` text,
  	\`pinterest_name\` text,
  	\`pinterest_description\` text,
  	\`pinterest_photo_id\` integer,
  	\`etsy_shop_url\` text,
  	\`adsense_enabled\` integer DEFAULT false,
  	\`adsense_client\` text,
  	\`adsense_in_feed\` text,
  	\`adsense_in_article\` text,
  	\`adsense_sidebar\` text,
  	\`analytics_token\` text,
  	\`verification_google\` text,
  	\`verification_pinterest\` text,
  	\`etsy_api_key\` text,
  	\`updated_at\` text,
  	\`created_at\` text,
  	FOREIGN KEY (\`pinterest_photo_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `);
  await db.run(
    sql`CREATE INDEX \`settings_pinterest_pinterest_photo_idx\` ON \`settings\` (\`pinterest_photo_id\`);`,
  );
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`patterns_gallery\`;`);
  await db.run(sql`DROP TABLE \`patterns\`;`);
  await db.run(sql`DROP TABLE \`_patterns_v_version_gallery\`;`);
  await db.run(sql`DROP TABLE \`_patterns_v\`;`);
  await db.run(sql`DROP TABLE \`categories\`;`);
  await db.run(sql`DROP TABLE \`articles\`;`);
  await db.run(sql`DROP TABLE \`_articles_v\`;`);
  await db.run(sql`DROP TABLE \`media\`;`);
  await db.run(sql`DROP TABLE \`users_sessions\`;`);
  await db.run(sql`DROP TABLE \`users\`;`);
  await db.run(sql`DROP TABLE \`payload_kv\`;`);
  await db.run(sql`DROP TABLE \`payload_locked_documents\`;`);
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`);
  await db.run(sql`DROP TABLE \`payload_preferences\`;`);
  await db.run(sql`DROP TABLE \`payload_preferences_rels\`;`);
  await db.run(sql`DROP TABLE \`payload_migrations\`;`);
  await db.run(sql`DROP TABLE \`homepage_products\`;`);
  await db.run(sql`DROP TABLE \`homepage\`;`);
  await db.run(sql`DROP TABLE \`listings\`;`);
  await db.run(sql`DROP TABLE \`about\`;`);
  await db.run(sql`DROP TABLE \`privacy\`;`);
  await db.run(sql`DROP TABLE \`terms\`;`);
  await db.run(sql`DROP TABLE \`settings_social\`;`);
  await db.run(sql`DROP TABLE \`settings\`;`);
}
