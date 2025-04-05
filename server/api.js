const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bodyParser = require('body-parser');

const deals = require('./DEALS.json');
const sales = require('./DEALSVinted.json');

// Crée l'app Express à chaque appel
const createApp = () => {
  const app = express();

  app.use(bodyParser.json());
  app.use(cors());
  app.use(helmet());

  app.get('/', (req, res) => {
    res.send({ ack: true });
  });

  app.get('/deals/search', (req, res) => {
    const { limit, price, date } = req.query;
    let results = [...deals];

    if (price) {
      results = results.filter(d => d.price <= parseFloat(price));
    }

    if (date) {
      const timestamp = new Date(date).getTime() / 1000;
      results = results.filter(d => d.published >= timestamp);
    }

    results = results.sort((a, b) => a.price - b.price);
    const finalResults = limit ? results.slice(0, parseInt(limit)) : results;

    res.json({
      limit: limit ? parseInt(limit) : 'no limit',
      total: results.length,
      results: finalResults
    });
  });

  app.get('/deals/:id', (req, res) => {
    const deal = deals.find(d => d.id === req.params.id);
    if (!deal) {
      return res.status(404).json({ error: 'Deal non trouvé' });
    }
    res.json(deal);
  });

  app.get('/sales/search', (req, res) => {
    const { limit, legoSetId } = req.query;
    let results = [...sales];

    if (legoSetId) {
      results = results.filter(s => s.link.includes(legoSetId));
    }

    results = results.sort((a, b) => b.published - a.published);
    const finalResults = limit ? results.slice(0, parseInt(limit)) : results;

    res.json({
      limit: limit ? parseInt(limit) : 'no limit',
      total: results.length,
      results: finalResults
    });
  });

  return app;
};

// Export pour Vercel (serverless)
const app = createApp();
module.exports = (req, res) => {
  // CORS headers pour les requêtes OPTIONS préflight
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  return app(req, res);
};