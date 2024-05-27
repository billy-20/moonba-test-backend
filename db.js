
// Importation de l'objet Pool depuis le module 'pg'. Pool est une collection de connexions à la base de données
const { Pool } = require('pg');

// Récupération du mot de passe de la base de données depuis les variables d'environnement. 
const password = process.env.DB_PASSWORD;


// Configuration de la connexion à la base de données PostgreSQL
const pool = new Pool({
    user: 'postgres.oorgdgcnkgqjrtwbhdan', 
    host: 'aws-0-eu-central-1.pooler.supabase.com', 
    database: 'postgres', 
    password: password, 
    port: 5432, 
  });

  // Exportation de l'instance de pool pour permettre son utilisation dans d'autres parties de l'application.
module.exports = pool;
