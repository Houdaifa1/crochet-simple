import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`patterns\` ADD \`seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`patterns\` ADD \`seo_description\` text;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` ADD \`version_seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` ADD \`version_seo_description\` text;`)
  await db.run(sql`ALTER TABLE \`categories\` ADD \`seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`categories\` ADD \`seo_description\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`seo_description\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_seo_description\` text;`)
  await db.run(sql`ALTER TABLE \`listings\` ADD \`patterns_seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`listings\` ADD \`journal_seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`about\` ADD \`seo_title\` text;`)
  await db.run(sql`ALTER TABLE \`about\` ADD \`seo_description\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`patterns\` DROP COLUMN \`seo_title\`;`)
  await db.run(sql`ALTER TABLE \`patterns\` DROP COLUMN \`seo_description\`;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` DROP COLUMN \`version_seo_title\`;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` DROP COLUMN \`version_seo_description\`;`)
  await db.run(sql`ALTER TABLE \`categories\` DROP COLUMN \`seo_title\`;`)
  await db.run(sql`ALTER TABLE \`categories\` DROP COLUMN \`seo_description\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`seo_title\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`seo_description\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_seo_title\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_seo_description\`;`)
  await db.run(sql`ALTER TABLE \`listings\` DROP COLUMN \`patterns_seo_title\`;`)
  await db.run(sql`ALTER TABLE \`listings\` DROP COLUMN \`journal_seo_title\`;`)
  await db.run(sql`ALTER TABLE \`about\` DROP COLUMN \`seo_title\`;`)
  await db.run(sql`ALTER TABLE \`about\` DROP COLUMN \`seo_description\`;`)
}
