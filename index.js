const express = require('express');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pour parser le JSON
app.use(bodyParser.json());
app.use(cors());

// Utilisation des routes
app.use('/users', userRoutes);

// Démarrage du serveur
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
