import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`patterns\` ADD \`download_picture_id\` integer REFERENCES media(id);`)
  await db.run(sql`CREATE INDEX \`patterns_download_picture_idx\` ON \`patterns\` (\`download_picture_id\`);`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` ADD \`version_download_picture_id\` integer REFERENCES media(id);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_version_version_download_picture_idx\` ON \`_patterns_v\` (\`version_download_picture_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_patterns\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`title\` text,
  	\`summary\` text,
  	\`category_id\` integer,
  	\`cover_id\` integer,
  	\`video\` text,
  	\`pin_image_id\` integer,
  	\`pdf_id\` integer,
  	\`pdf_pages\` numeric,
  	\`etsy_url\` text,
  	\`details_skill\` text,
  	\`details_time\` text,
  	\`details_hook\` text,
  	\`details_yarn\` text,
  	\`details_size\` text,
  	\`body\` text,
  	\`heading\` text,
  	\`seo_title\` text,
  	\`seo_description\` text,
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
  `)
  await db.run(sql`INSERT INTO \`__new_patterns\`("id", "title", "summary", "category_id", "cover_id", "video", "pin_image_id", "pdf_id", "pdf_pages", "etsy_url", "details_skill", "details_time", "details_hook", "details_yarn", "details_size", "body", "heading", "seo_title", "seo_description", "slug", "published", "updated", "show_ads", "updated_at", "created_at", "_status") SELECT "id", "title", "summary", "category_id", "cover_id", "video", "pin_image_id", "pdf_id", "pdf_pages", "etsy_url", "details_skill", "details_time", "details_hook", "details_yarn", "details_size", "body", "heading", "seo_title", "seo_description", "slug", "published", "updated", "show_ads", "updated_at", "created_at", "_status" FROM \`patterns\`;`)
  await db.run(sql`DROP TABLE \`patterns\`;`)
  await db.run(sql`ALTER TABLE \`__new_patterns\` RENAME TO \`patterns\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`patterns_category_idx\` ON \`patterns\` (\`category_id\`);`)
  await db.run(sql`CREATE INDEX \`patterns_cover_idx\` ON \`patterns\` (\`cover_id\`);`)
  await db.run(sql`CREATE INDEX \`patterns_pin_image_idx\` ON \`patterns\` (\`pin_image_id\`);`)
  await db.run(sql`CREATE INDEX \`patterns_pdf_idx\` ON \`patterns\` (\`pdf_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`patterns_slug_idx\` ON \`patterns\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`patterns_updated_at_idx\` ON \`patterns\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`patterns_created_at_idx\` ON \`patterns\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`patterns__status_idx\` ON \`patterns\` (\`_status\`);`)
  await db.run(sql`CREATE TABLE \`__new__patterns_v\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`parent_id\` integer,
  	\`version_title\` text,
  	\`version_summary\` text,
  	\`version_category_id\` integer,
  	\`version_cover_id\` integer,
  	\`version_video\` text,
  	\`version_pin_image_id\` integer,
  	\`version_pdf_id\` integer,
  	\`version_pdf_pages\` numeric,
  	\`version_etsy_url\` text,
  	\`version_details_skill\` text,
  	\`version_details_time\` text,
  	\`version_details_hook\` text,
  	\`version_details_yarn\` text,
  	\`version_details_size\` text,
  	\`version_body\` text,
  	\`version_heading\` text,
  	\`version_seo_title\` text,
  	\`version_seo_description\` text,
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
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`patterns\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_category_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_cover_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_pin_image_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null,
  	FOREIGN KEY (\`version_pdf_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`INSERT INTO \`__new__patterns_v\`("id", "parent_id", "version_title", "version_summary", "version_category_id", "version_cover_id", "version_video", "version_pin_image_id", "version_pdf_id", "version_pdf_pages", "version_etsy_url", "version_details_skill", "version_details_time", "version_details_hook", "version_details_yarn", "version_details_size", "version_body", "version_heading", "version_seo_title", "version_seo_description", "version_slug", "version_published", "version_updated", "version_show_ads", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave") SELECT "id", "parent_id", "version_title", "version_summary", "version_category_id", "version_cover_id", "version_video", "version_pin_image_id", "version_pdf_id", "version_pdf_pages", "version_etsy_url", "version_details_skill", "version_details_time", "version_details_hook", "version_details_yarn", "version_details_size", "version_body", "version_heading", "version_seo_title", "version_seo_description", "version_slug", "version_published", "version_updated", "version_show_ads", "version_updated_at", "version_created_at", "version__status", "created_at", "updated_at", "latest", "autosave" FROM \`_patterns_v\`;`)
  await db.run(sql`DROP TABLE \`_patterns_v\`;`)
  await db.run(sql`ALTER TABLE \`__new__patterns_v\` RENAME TO \`_patterns_v\`;`)
  await db.run(sql`CREATE INDEX \`_patterns_v_parent_idx\` ON \`_patterns_v\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_version_version_category_idx\` ON \`_patterns_v\` (\`version_category_id\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_version_version_cover_idx\` ON \`_patterns_v\` (\`version_cover_id\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_version_version_pin_image_idx\` ON \`_patterns_v\` (\`version_pin_image_id\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_version_version_pdf_idx\` ON \`_patterns_v\` (\`version_pdf_id\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_version_version_slug_idx\` ON \`_patterns_v\` (\`version_slug\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_version_version_updated_at_idx\` ON \`_patterns_v\` (\`version_updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_version_version_created_at_idx\` ON \`_patterns_v\` (\`version_created_at\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_version_version__status_idx\` ON \`_patterns_v\` (\`version__status\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_created_at_idx\` ON \`_patterns_v\` (\`created_at\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_updated_at_idx\` ON \`_patterns_v\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_latest_idx\` ON \`_patterns_v\` (\`latest\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_autosave_idx\` ON \`_patterns_v\` (\`autosave\`);`)
}
