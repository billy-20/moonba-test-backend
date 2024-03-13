require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');
const stripeRoutes = require('./routes/stripe');
const formationRoutes= require('./routes/formationRoutes');
const cors = require('cors');
const inscriptionRoutes= require('./routes/InscriptionRoutes');
const sessionsRoutes = require('./routes/SessionRoutes');
const promoRoutes = require('./routes/codePromoRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(cors());

// ROUTES
app.use('/users', userRoutes);
app.use('/stripe', stripeRoutes);
app.use('/formation', formationRoutes);
app.use('/clients',inscriptionRoutes )
app.use('/sessions' , sessionsRoutes);
app.use('/promoCode' , promoRoutes);


// DEMARRAGE DU SERVEUR ICI
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
