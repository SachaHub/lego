const { MongoClient } = require('mongodb');
const dealSource = require('./websites/dealabs');
const fs = require('fs').promises;
const path = require('path');

const DB_URI = 'mongodb+srv://sachalieges:F4G5H6HF@cluster0.d7bfpoj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME = 'Lego';

// Connexion à la base de données
async function openConnection() {
    const client = new MongoClient(DB_URI);
    await client.connect();
    console.log("✔️ Database connected");
    return { db: client.db(DB_NAME), client };
}

// Déconnexion propre
async function disconnect(client) {
    await client.close();
    console.log("❌ Database connection closed.");
}

// Lire un fichier JSON
async function readJSONFile(fileName) {
    try {
        const content = await fs.readFile(path.join(__dirname, fileName), 'utf-8');
        return JSON.parse(content);
    } catch (err) {
        console.error(`⚠️ Failed to read ${fileName}:`, err);
        return [];
    }
}

// Ajouter les bons plans
async function uploadDeals(db) {
    const items = await readJSONFile('Alldeals.json');
    if (!Array.isArray(items) || items.length === 0) {
        console.warn("No deals found in Alldeals.json!");
        return;
    }

    const dealsCollection = db.collection('deals');
    await dealsCollection.deleteMany({});
    const result = await dealsCollection.insertMany(items);
    console.log(`✅ ${result.insertedCount} deals uploaded.`);
}

// Trier les deals par réduction
async function getTopDiscountDeals(db) {
    const deals = await db.collection('deals')
        .find().sort({ discount: -1 }).toArray();
    console.log("🔥 Deals with best discounts:", deals);
}

// Trier par commentaires
async function getTopCommentedDeals(db) {
    const deals = await db.collection('deals')
        .find().sort({ comments: -1 }).toArray();
    console.log("💬 Most discussed deals:", deals);
}

// Trier par prix croissant
async function getDealsByPrice(db) {
    const deals = await db.collection('deals')
        .find().sort({ price: 1 }).toArray();
    console.log("💸 Deals sorted by price:", deals);
}

// Trier par date (récent en premier)
async function getDealsByDate(db) {
    const deals = await db.collection('deals')
        .find().sort({ published: -1 }).toArray();
    console.log("🗓️ Deals by recency:", deals);
}

// Rechercher les ventes d'un set spécifique
async function searchSalesBySetId(db, setId) {
    if (!setId) {
        console.log("⛔ Invalid Set ID.");
        return;
    }

    const collection = db.collection('sales');
    console.log(`🔎 Looking up sales for set ID: ${setId}`);

    const found = await collection.find({ id: setId }).limit(100).toArray();

    if (found.length > 0) {
        console.log(`📦 Found ${found.length} sales for set ${setId}:`);
        found.forEach((item, idx) => {
            console.log(`--- #${idx + 1} ---`);
            console.log(`ID: ${item.id}`);
            console.log(`Title: ${item.title}`);
            console.log(`Price: ${item.price}€`);
            console.log(`Published: ${item.published}`);
            console.log(`Status: ${item.status}`);
            console.log(`Link: ${item.link}\n`);
        });
    } else {
        console.log(`🔍 No sales found for set ${setId}.`);
    }
}

// Ventes récentes (moins de 3 semaines)
async function getRecentSales(db) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 21);
    console.log("📅 Filtering sales since:", cutoffDate);

    const sales = await db.collection('sales').aggregate([
        {
            $addFields: {
                parsedDate: {
                    $dateFromString: {
                        dateString: "$published",
                        format: "%d/%m/%Y %H:%M:%S"
                    }
                }
            }
        },
        {
            $match: {
                parsedDate: { $gte: cutoffDate }
            }
        },
        {
            $sort: { parsedDate: -1 }
        }
    ]).toArray();

    console.log("🕒 Recent sales (< 3 weeks):", sales);
}

// Interface CLI
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askInput(questionText) {
    return new Promise(resolve => rl.question(questionText, resolve));
}

// Lancement du programme
async function runApp() {
    const { db, client } = await openConnection();

    console.log("\n===== 🚀 UPLOADING DATA =====\n");
    await uploadDeals(db);

    console.log("\n===== 🔥 BEST DEALS =====\n");
    await getTopDiscountDeals(db);

    console.log("\n===== 💬 MOST COMMENTED =====\n");
    await getTopCommentedDeals(db);

    console.log("\n===== 💰 BY PRICE =====\n");
    await getDealsByPrice(db);

    console.log("\n===== 🕒 BY DATE =====\n");
    await getDealsByDate(db);

    const setId = await askInput("\nEnter a LEGO Set ID to check sales: ");
    await searchSalesBySetId(db, setId);

    console.log("\n===== ⏳ RECENT SALES =====\n");
    await getRecentSales(db);

    rl.close();
    await disconnect(client);
}

runApp().catch(console.error);
