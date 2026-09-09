import mariadb from 'mariadb';

const conn = await mariadb.createConnection({ host: 'localhost', port: 3306, user: 'root', password: '' });
const rows = await conn.query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = 'wa_blast'");
if (rows.length === 0) {
  await conn.query('CREATE DATABASE wa_blast CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci');
  console.log('database wa_blast created');
} else {
  console.log('database wa_blast already exists');
}
await conn.end();