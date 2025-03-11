// Try different import methods for parse-domain
let parseDomain;
try {
  const parseModule = require('parse-domain');
  parseDomain = parseModule.parseDomain || parseModule;
} catch (error) {
  console.error('Error importing parse-domain:', error);
  process.exit(1);
}

const websites = require('require-all')(`${__dirname}/websites`);
const fs = require('fs');
const path = require('path');

async function sandbox(website = 'https://www.avenuedelabrique.com/nouveautes-lego') {
  try {
    console.log(`🕵️‍♀️  browsing ${website} website`);
   
    // Extract domain name from URL
    const url = new URL(website);
    const hostname = url.hostname;
   
    // Get domain name without www. prefix
    const domainParts = hostname.split('.');
    let domain;
   
    if (domainParts[0] === 'www') {
      domain = domainParts[1];
    } else {
      domain = domainParts[0];
    }
   
    if (!websites[domain]) {
      throw new Error(`No scraper found for domain: ${domain}`);
    }
   
    const deals = await websites[domain].scrape(website);
    
    // Create a summary for console
    if (deals && deals.length > 0) {
      console.log(`Found ${deals.length} items`);
      console.log('Sample items:');
      
      // Show up to 3 sample items
      deals.slice(0, 3).forEach((deal, i) => {
        console.log(`${i+1}. ${deal.title} - ${deal.price}€`);
      });
      
      // Save all deals to a single file
      const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
      const filename = `all_deals_${timestamp}.json`;
      const dataDir = path.join(__dirname, '..', 'data');
      
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
    
    console.log('done');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

const [,, eshop] = process.argv;
sandbox(eshop);