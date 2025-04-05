const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const {MongoClient} = require('mongodb');

const PORT = 8092;
const MONGODB_URI = 'mongodb+srv://Hackkmae:MANGOlogan159@hackmae.lzdgy.mongodb.net/?retryWrites=true&w=majority&appName=Hackmae';
const MONGODB_DB_NAME = 'Lego';

const app = express();

app.use(require('body-parser').json());
app.use(cors());
app.use(helmet());

app.options('*', cors());

let db;

// Connexion à MongoDB
async function connectDB() {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db(MONGODB_DB_NAME);
    console.log("Connected to MongoDB");
}

// Fermer la connexion MongoDB
async function closeDB(client) {
    await client.close();
    console.log("MongoDB connection closed.");
}


// Middleware pour activer CORS sur toutes les routes
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // Autorise toutes les origines (tu peux aussi spécifier une origine spécifique)
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS'); // Méthodes autorisées
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization'); // Headers autorisés
  if (req.method === 'OPTIONS') {
    res.status(204).end(); // Répondre directement au preflight avec un status 204
    return;
  }
  next();
});



// Test Route
app.get('/', (req, res) => {
  res.send({'ack': true});
});


// GET /deals/search - Search for deals with filters
app.get('/deals/search', async (req, res) => {
  try {
    console.log(' --- Début de la requête /deals/search --- ');

    // 1. Récupération des paramètres de la requête
    const {
      limit = 35,   // Nombre max de résultats 
      price,         // Prix maximum
      date,          // Date de publication
      filterBy        // Critère de tri (best-discount, most-commented)
    } = req.query;

    const query = {};
    const sort = {};

    console.log(`Params reçus : limit=${limit}, price=${price}, date=${date}, filterBy=${filterBy}`);

    // 2. Filtrage par prix (si spécifié)
    if (price) {
      if (price.startsWith('>')) {
        const value = parseFloat(price.substring(1));
        query.price = { $gt: value };
        console.log(`Filtre prix > ${value}`);
      } else if (price.startsWith('<')) {
        const value = parseFloat(price.substring(1));
        query.price = { $lt: value };
        console.log(`Filtre prix < ${value}`);
      } else {
        const value = parseFloat(price);
        query.price = value;
        console.log(`Filtre prix = ${value}`);
      }
    }

    // 3. Filtrage par date (si spécifié)
    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1); // Inclure la journée complète

      console.log(`Filtre date entre ${startDate.toISOString()} et ${endDate.toISOString()}`);

      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
        query.published = {
          $gte: startDate.toISOString(),
          $lt: endDate.toISOString()
        };
        console.log(`Filtre date ajouté : ${JSON.stringify(query.published)}`);
      } else {
        console.log(`Date incorrecte : ${date}`);
      }
    }

    // 4. Tri par critères spécifiques
    if (filterBy === 'best-discount') {
      sort.discount = -1; // Trier par réduction la plus élevée (descendant)
      console.log('Tri par meilleure réduction');
    } else if (filterBy === 'most-commented') {
      sort.comments = -1; // Trier par le nombre de commentaires le plus élevé (descendant)
      console.log('Tri par nombre de commentaires');
    } else {
      sort.price = 1; // Tri par prix croissant (par défaut)
      console.log('Tri par prix croissant');
    }

    // 5. Vérification de la requête finale
    console.log('--- QUERY FINALE ---');
    console.log(`Query : ${JSON.stringify(query, null, 2)}`);
    console.log(`Sort : ${JSON.stringify(sort, null, 2)}`);
    console.log(`Limit : ${limit}`);

    // 6. Lancer la requête MongoDB
    const deals = await db.collection('deals')
      .find(query)
      .sort(sort)
      .limit(parseInt(limit))
      .toArray();

    console.log(`Nombre de résultats trouvés : ${deals.length}`);

    if (deals.length === 0) {
      console.log('Aucun résultat trouvé');
      return res.status(404).json({ error: 'Aucun deal trouvé' });
    }

    // 7. Retourner la réponse formatée
    res.json({
      limit: parseInt(limit),
      total: deals.length,
      results: deals
    });
  } catch (error) {
    console.error(`Error searching deals:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// GET /deals/:id - Get a specific deal
app.get('/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Searching for deal with ID: ${id}`);

    // Chercher le deal dans la collection MongoDB
    const deal = await db.collection('deals').findOne({ id });

    if (!deal) {
      return res.status(404).json({ error: 'Deal not found' });
    }

    res.json(deal);
  } catch (error) {
    console.error(`Error fetching deal with ID ${req.params.id}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});



// 3. GET /sales/search - Search for specific sales
app.get('/sales/search', async (req, res) => {
  try {
    console.log('--- Début de la requête /sales/search --- ');

    // 1. Récupération des paramètres de la requête
    const {
      legoSetId      // ID spécifique du set Lego
    } = req.query;

    const query = {};
    const sort = {};

    console.log(`Params reçus : legoSetId=${legoSetId}`);

    // 2. Filtrage par ID du set Lego (si spécifié)
    if (legoSetId) {
      query.id = legoSetId;
      console.log(`Filtre Lego Set ID = ${legoSetId}`);
    }

    // 3. Tri par date de publication (ordre décroissant)
    sort.published = -1;
    console.log('Tri par date de publication (plus récent en premier)');

    // 4. Vérification de la requête finale
    console.log('--- QUERY FINALE ---');
    console.log(`Query : ${JSON.stringify(query, null, 2)}`);
    console.log(`Sort : ${JSON.stringify(sort, null, 2)}`);

    // 5. Lancer la requête MongoDB
    const sales = await db.collection('sales')
      .find(query)
      .sort(sort)
      .toArray();

    console.log(`Nombre de résultats trouvés : ${sales.length}`);

    if (sales.length === 0) {
      console.log('Aucun résultat trouvé');
      return res.status(404).json({ error: 'Aucune vente trouvée' });
    }

    // 6. Retourner la réponse formatée
    res.json({
      total: sales.length,
      results: sales
    });
  } catch (error) {
    console.error(`Error searching sales:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});







// Lancer le serveur et connecter à MongoDB
async function startServer() {
  try {
    await connectDB(); // Connexion à MongoDB

    app.listen(PORT, () => {
      console.log(`📡 Running on port ${PORT}`);
    });

  } catch (error) {
    console.error('Failed to connect to MongoDB:', error);
    process.exit(1); // Quitter en cas d'erreur de connexion
  }
}

// Exporter le handler pour Vercel
module.exports = async (req, res) => {
  if (!db) {
    await connectDB();
  }
  return app(req, res);
};


// Arrêt propre de la connexion MongoDB
process.on('SIGINT', async () => {
  await closeDB();
  process.exit(0);
});

startServer(); // Lancer le serveur