import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`patterns\` ADD \`heading\` text;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` ADD \`version_heading\` text;`)
  await db.run(sql`ALTER TABLE \`articles\` ADD \`heading\` text;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`version_heading\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`patterns\` DROP COLUMN \`heading\`;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` DROP COLUMN \`version_heading\`;`)
  await db.run(sql`ALTER TABLE \`articles\` DROP COLUMN \`heading\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`version_heading\`;`)
}
