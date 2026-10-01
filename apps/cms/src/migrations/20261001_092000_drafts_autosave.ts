import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`ALTER TABLE \`_patterns_v\` ADD \`autosave\` integer;`)
  await db.run(sql`CREATE INDEX \`_patterns_v_autosave_idx\` ON \`_patterns_v\` (\`autosave\`);`)
  await db.run(sql`ALTER TABLE \`_articles_v\` ADD \`autosave\` integer;`)
  await db.run(sql`CREATE INDEX \`_articles_v_autosave_idx\` ON \`_articles_v\` (\`autosave\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP INDEX \`_patterns_v_autosave_idx\`;`)
  await db.run(sql`ALTER TABLE \`_patterns_v\` DROP COLUMN \`autosave\`;`)
  await db.run(sql`DROP INDEX \`_articles_v_autosave_idx\`;`)
  await db.run(sql`ALTER TABLE \`_articles_v\` DROP COLUMN \`autosave\`;`)
}
