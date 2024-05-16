# Étape 1: Définir l'image de base
FROM node:16

# Étape 2: Définir le répertoire de travail dans le conteneur
WORKDIR /usr/src/app

# Étape 3: Copier les fichiers de dépendances
COPY package*.json ./

# Étape 4: Installer les dépendances
RUN npm install

# Étape 5: Copier tous les fichiers du projet dans le conteneur
COPY . .

# Étape 6: Exposer le port sur lequel votre app va tourner
EXPOSE 3000

# Étape 7: Définir la commande pour démarrer votre application
CMD ["node", "index.js"]
