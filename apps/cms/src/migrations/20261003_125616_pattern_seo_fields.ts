import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`patterns\` ADD \`video\` text;`)
  await db.run(sql`ALTER TABLE \`patterns\` ADD \`details_skill\` text;`)
  await db.run(sql`ALTER TABLE \`patterns\` ADD \`details_time\` text;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` ADD \`version_video\` text;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` ADD \`version_details_skill\` text;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` ADD \`version_details_time\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`patterns\` DROP COLUMN \`video\`;`)
  await db.run(sql`ALTER TABLE \`patterns\` DROP COLUMN \`details_skill\`;`)
  await db.run(sql`ALTER TABLE \`patterns\` DROP COLUMN \`details_time\`;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` DROP COLUMN \`version_video\`;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` DROP COLUMN \`version_details_skill\`;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` DROP COLUMN \`version_details_time\`;`)
}
