const { Pool } = require('pg');

// Configuration de la connexion à la base de données PostgreSQL
const pool = new Pool({
    user: 'jkrtaorl',
    host: 'kandula.db.elephantsql.com',
    database: 'jkrtaorl',
    password: '5Yop56NupYhasPdEWNgK1KoeULqgSQlM',
    port: 5432, // Port par défaut de PostgreSQL
  });

module.exports = pool;
