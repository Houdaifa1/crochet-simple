import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`settings\` ADD \`controls_search_label\` text;`)
  await db.run(sql`ALTER TABLE \`settings\` ADD \`controls_download_label\` text;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`settings\` DROP COLUMN \`controls_search_label\`;`)
  await db.run(sql`ALTER TABLE \`settings\` DROP COLUMN \`controls_download_label\`;`)
}
