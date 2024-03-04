const { Pool } = require('pg');
const password = process.env.DB_PASSWORD;
// Configuration de la connexion à la base de données PostgreSQL
const pool = new Pool({
    user: 'postgres.oorgdgcnkgqjrtwbhdan', 
    host: 'aws-0-eu-central-1.pooler.supabase.com', 
    database: 'postgres', 
    password: password, 
    port: 5432, 
  });

module.exports = pool;
