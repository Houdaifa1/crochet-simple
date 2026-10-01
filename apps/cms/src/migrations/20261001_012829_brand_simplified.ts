import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_homepage\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`seo_title\` text DEFAULT 'Crochet Simplified | Crochet patterns and tutorials' NOT NULL,
  	\`seo_description\` text DEFAULT 'Follow one thread as it becomes seven crochet designs, then find clear crochet patterns, tutorials and notes from the studio.' NOT NULL,
  	\`headline\` text DEFAULT 'Every piece begins with' NOT NULL,
  	\`headline_accent\` text DEFAULT 'one thread.' NOT NULL,
  	\`cue\` text DEFAULT 'Scroll to follow the thread' NOT NULL,
  	\`ending_eyebrow\` text DEFAULT 'Crochet Simplified' NOT NULL,
  	\`ending_title\` text DEFAULT 'One thread.' NOT NULL,
  	\`ending_accent\` text DEFAULT 'Endless things to make.' NOT NULL,
  	\`ending_text\` text DEFAULT 'Clear patterns, step by step tutorials and notes from the studio.' NOT NULL,
  	\`primary_button\` text DEFAULT 'Browse patterns' NOT NULL,
  	\`secondary_button\` text DEFAULT 'Read the journal' NOT NULL,
  	\`updated_at\` text,
  	\`created_at\` text
  );
  `)
  await db.run(sql`INSERT INTO \`__new_homepage\`("id", "seo_title", "seo_description", "headline", "headline_accent", "cue", "ending_eyebrow", "ending_title", "ending_accent", "ending_text", "primary_button", "secondary_button", "updated_at", "created_at") SELECT "id", "seo_title", "seo_description", "headline", "headline_accent", "cue", "ending_eyebrow", "ending_title", "ending_accent", "ending_text", "primary_button", "secondary_button", "updated_at", "created_at" FROM \`homepage\`;`)
  await db.run(sql`DROP TABLE \`homepage\`;`)
  await db.run(sql`ALTER TABLE \`__new_homepage\` RENAME TO \`homepage\`;`)
  await db.run(
    sql`UPDATE \`homepage\` SET \`seo_title\` = 'Crochet Simplified | Crochet patterns and tutorials' WHERE \`seo_title\` = 'Crochet Simple | Crochet patterns and tutorials';`,
  )
  await db.run(
    sql`UPDATE \`homepage\` SET \`ending_eyebrow\` = 'Crochet Simplified' WHERE \`ending_eyebrow\` = 'Crochet Simple';`,
  )
  await db.run(sql`PRAGMA foreign_keys=ON;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_homepage\` (
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
  `)
  await db.run(sql`INSERT INTO \`__new_homepage\`("id", "seo_title", "seo_description", "headline", "headline_accent", "cue", "ending_eyebrow", "ending_title", "ending_accent", "ending_text", "primary_button", "secondary_button", "updated_at", "created_at") SELECT "id", "seo_title", "seo_description", "headline", "headline_accent", "cue", "ending_eyebrow", "ending_title", "ending_accent", "ending_text", "primary_button", "secondary_button", "updated_at", "created_at" FROM \`homepage\`;`)
  await db.run(sql`DROP TABLE \`homepage\`;`)
  await db.run(sql`ALTER TABLE \`__new_homepage\` RENAME TO \`homepage\`;`)
  await db.run(
    sql`UPDATE \`homepage\` SET \`seo_title\` = 'Crochet Simple | Crochet patterns and tutorials' WHERE \`seo_title\` = 'Crochet Simplified | Crochet patterns and tutorials';`,
  )
  await db.run(
    sql`UPDATE \`homepage\` SET \`ending_eyebrow\` = 'Crochet Simple' WHERE \`ending_eyebrow\` = 'Crochet Simplified';`,
  )
  await db.run(sql`PRAGMA foreign_keys=ON;`)
}
