const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

/**
 * Scrape deals from Dealabs
 * @param {string} url - The URL to scrape
 * @returns {Promise<Array>} - A promise that resolves to an array of deals
 */
async function scrape(url) {
  try {
    // Set headers to mimic a browser request
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://www.dealabs.com/'
    };
    // Make HTTP request to the dealabs page
    const response = await axios.get(url, { headers });
    const html = response.data;
    const $ = cheerio.load(html);
   
    // Log HTML structure for debugging
    console.log("Page loaded, looking for deals...");
   
    // Array to store our deals
    const deals = [];
   
    // Try different selectors for deal items
    const dealElements = $('article.thread');
   
    console.log(`Found ${dealElements.length} potential deals`);
   
    // Extract data from each deal element
    dealElements.each((index, element) => {
      try {
        const titleElement = $(element).find('h2, .threadCardTitle, .cept-tt');
        const title = titleElement.text().trim();
       
        // Try different price selectors
        const priceElement = $(element).find('.thread-price, .threadCardPrice, .cept-tp');
        const price = priceElement.length ? priceElement.text().trim() : "Price not found";
       
        // Get link
        let link = $(element).find('a.cept-tt, a.threadCardTitle, h2 a').attr('href');
       
        // Try different image selectors
        let imageUrl = $(element).find('img.thread-image, img.threadCardImage').attr('src') ||
                      $(element).find('img.thread-image, img.threadCardImage').attr('data-src') ||
                      $(element).find('img.cept-thread-img').attr('src');
       
        // Get temperature/hotness
        const hotnessElement = $(element).find('.cept-vote-temp, .vote-box--count, .threadCardDealVoteCount');
        const hotness = hotnessElement.length ? hotnessElement.text().trim() : "0";
       
        console.log(`Processing: ${title}`);
       
        // Add all deals since we're already filtering with search query
        deals.push({
          title,
          price,
          hotness,
          link,
          imageUrl,
          source: 'dealabs',
          scrapedAt: new Date().toISOString()
        });
      } catch (err) {
        console.error(`Error processing deal element: ${err.message}`);
      }
    });
   
    // Save the deals to a file
    await saveDeals(deals);
    
    return deals;
  } catch (error) {
    console.error('Error scraping Dealabs:', error.message);
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
    }
    return [];
  }
}

/**
 * Save deals to a JSON file
 * @param {Array} deals - Array of deal objects to save
 * @returns {Promise<void>}
 */
async function saveDeals(deals) {
  try {
    if (deals && deals.length > 0) {
      console.log(`Found ${deals.length} items`);
      console.log('Sample items:');
      
      // Show up to 3 sample items
      deals.slice(0, 3).forEach((deal, i) => {
        console.log(`${i+1}. ${deal.title} - ${deal.price}`);
      });
      
      // Save all deals to a single file
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const filename = `dealabs_deals_${timestamp}.json`;
      const dataDir = path.join(__dirname, '..', 'data'); // Use the same directory as your other script
      
      // Create data directory if it doesn't exist
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      
      const filePath = path.join(dataDir, filename);
      fs.writeFileSync(filePath, JSON.stringify(deals, null, 2));
      console.log(`💾 All data saved to ${filePath}`);
    } else {
      console.log('No items found');
    }
  } catch (error) {
    console.error('Error saving deals:', error.message);
  }
}

/**
 * Main function to scrape and save deals from a URL
 * @param {string} url - The URL to scrape
 */
async function main(url = 'https://www.dealabs.com/') {
  try {
    console.log(`🕵️‍♀️ browsing ${url} website`);
    await scrape(url);
    console.log('done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

// Export both the scrape function for modular use and the main function for direct execution
module.exports = {
  scrape,
  main
};

// If this file is being run directly, execute the main function with command line arguments
if (require.main === module) {
  const [,, url] = process.argv;
  main(url);
}