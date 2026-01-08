const { Pool } = require('pg');

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });
  }

  async query(text, params) {
    return this.pool.query(text, params);
  }

  async run(text, params) {
    const result = await this.pool.query(text, params);
    return {
      lastID: result.rows[0]?.id,
      changes: result.rowCount
    };
  }

  async all(text, params) {
    const result = await this.pool.query(text, params);
    return result.rows;
  }

  async get(text, params) {
    const result = await this.pool.query(text, params);
    return result.rows[0];
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = new Database();
