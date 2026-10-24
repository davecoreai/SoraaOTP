const { Pool } = require("@neondatabase/serverless");

let pool;
function getPool() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL belum dikonfigurasi.");
  if (!pool) pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
  return pool;
}
async function query(text, params = []) {
  const p = getPool();
  return p.query(text, params);
}
async function transaction(fn) {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    try { await client.query("ROLLBACK"); } catch {}
    throw error;
  } finally {
    client.release();
  }
}
module.exports = { query, transaction };
