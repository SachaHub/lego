const axios = require("axios");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

/**
 * Scrape deals from Vinted
 * @param {string} url - The URL to scrape (will extract search term from it)
 * @returns {Promise<Array>} - A promise that resolves to an array of deals
 */
async function scrape(url) {
  try {
    // Extract search term from URL or use default
    let searchText = "42151";  // Default search
    
    // Try to extract search term from URL if it contains one
    const urlObj = new URL(url);
    if (urlObj.searchParams.has('q')) {
      searchText = urlObj.searchParams.get('q');
    } else if (url.includes("/search")) {
      const pathParts = urlObj.pathname.split('/');
      const searchIndex = pathParts.indexOf('search');
      if (searchIndex >= 0 && searchIndex < pathParts.length - 1) {
        searchText = pathParts[searchIndex + 1];
      }
    }
    
    console.log(`🔍 Searching for "${searchText}" on Vinted...`);
    
    // Get Vinted access token
    const accessToken = await getVintedAccessToken();
    
    // Construct API URL
    const VINTED_API_URL = `https://www.vinted.fr/api/v2/catalog/items?page=1&per_page=96&search_text=${encodeURIComponent(searchText)}`;
    const HEADERS = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Cookie": `access_token_web=${accessToken}`
    };
    
    console.log(`📡 Making API request to Vinted...`);
    const response = await axios.get(VINTED_API_URL, { headers: HEADERS });
    const items = response.data.items;
    
    const filteredItems = items.map(item => ({
      id: item.id,
      title: item.title,
      price: item.price_numeric,
      url: `https://www.vinted.fr/items/${item.id}`,
      imageUrl: item.photo?.url || null,
      source: 'vinted',
      scrapedAt: new Date().toISOString()
    }));
    
    console.log(`✅ Retrieved ${filteredItems.length} items for "${searchText}"!`);
    
    // Save to a JSON file
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    const filename = `vinted_${searchText.replace(/\s+/g, '_')}_${timestamp}.json`;
    const dataDir = path.join(__dirname, '..', 'data');
    
    // Create data directory if it doesn't exist
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    const filePath = path.join(dataDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(filteredItems, null, 2));
    console.log(`💾 Data saved to ${filePath}`);
    
    return filteredItems;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return [];
  }
}

/**
 * Get Vinted access token using Puppeteer
 * @returns {Promise<string>} - Vinted access token
 */
async function getVintedAccessToken() {
  console.log("📡 Getting cookies via Puppeteer...");
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto("https://www.vinted.fr/", { waitUntil: "networkidle2" });
  const cookies = await page.cookies();
  await browser.close();
  
  const accessTokenCookie = cookies.find(cookie => cookie.name === "access_token_web");
  if (!accessTokenCookie) {
    throw new Error("❌ Could not retrieve access_token_web cookie.");
  }
  
  console.log("✅ Cookie successfully retrieved!");
  return accessTokenCookie.value;
}

module.exports = {
  scrape
};