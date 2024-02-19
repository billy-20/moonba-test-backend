const { Pool } = require('pg');
const password = process.env.DB_PASSWORD;
// Configuration de la connexion à la base de données PostgreSQL
const pool = new Pool({
    user: 'postgres.oorgdgcnkgqjrtwbhdan', // Remplacez par votre nom d'utilisateur Supabase
    host: 'aws-0-eu-central-1.pooler.supabase.com', // Host fourni par Supabase
    database: 'postgres', // Nom de la base de données Supabase
    password: password, // Remplacez [YOUR-PASSWORD] par votre mot de passe réel
    port: 5432, // Port par défaut de PostgreSQL
  });

module.exports = pool;
