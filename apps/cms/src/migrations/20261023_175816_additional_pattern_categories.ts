import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`patterns_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`categories_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`patterns\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`patterns_rels_order_idx\` ON \`patterns_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`patterns_rels_parent_idx\` ON \`patterns_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`patterns_rels_path_idx\` ON \`patterns_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`patterns_rels_categories_id_idx\` ON \`patterns_rels\` (\`categories_id\`);`)
  await db.run(sql`CREATE TABLE \`_patterns_v_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`categories_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`_patterns_v\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`categories_id\`) REFERENCES \`categories\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`CREATE INDEX \`_patterns_v_rels_order_idx\` ON \`_patterns_v_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_rels_parent_idx\` ON \`_patterns_v_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_rels_path_idx\` ON \`_patterns_v_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`_patterns_v_rels_categories_id_idx\` ON \`_patterns_v_rels\` (\`categories_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`patterns_rels\`;`)
  await db.run(sql`DROP TABLE \`_patterns_v_rels\`;`)
}
