import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`patterns\` ADD \`details_terms\` text;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` ADD \`version_details_terms\` text;`)
  await db.run(sql`ALTER TABLE \`categories\` ADD \`guide\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`patterns\` DROP COLUMN \`details_terms\`;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` DROP COLUMN \`version_details_terms\`;`)
  await db.run(sql`ALTER TABLE \`categories\` DROP COLUMN \`guide\`;`)
}
