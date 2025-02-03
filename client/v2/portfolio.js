// Invoking strict mode https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Strict_mode#invoking_strict_mode
'use strict';

/**
Description of the available api
GET https://lego-api-blue.vercel.app/deals

Search for specific deals

This endpoint accepts the following optional query string parameters:

- `page` - page of deals to return
- `size` - number of deals to return

GET https://lego-api-blue.vercel.app/sales

Search for current Vinted sales for a given lego set id

This endpoint accepts the following optional query string parameters:

- `id` - lego set id to return
*/

// current deals on the page
let currentDeals = [];
let currentPagination = {};

// instantiate the selectors
const selectShow = document.querySelector('#show-select');
const selectPage = document.querySelector('#page-select');
const selectLegoSetIds = document.querySelector('#lego-set-id-select');
const sectionDeals= document.querySelector('#deals');
const spanNbDeals = document.querySelector('#nbDeals');

/**
 * Set global value
 * @param {Array} result - deals to display
 * @param {Object} meta - pagination meta info
 */
const setCurrentDeals = ({result, meta}) => {
  currentDeals = result;
  currentPagination = meta;
};

/**
 * Fetch deals from api
 * @param  {Number}  [page=1] - current page to fetch
 * @param  {Number}  [size=12] - size of the page
 * @return {Object}
 */
const fetchDeals = async (page = 1, size = 6) => {
  try {
    const response = await fetch(
      `https://lego-api-blue.vercel.app/deals?page=${page}&size=${size}`
    );
    const body = await response.json();

    if (body.success !== true) {
      console.error(body);
      return {currentDeals, currentPagination};
    }

    return body.data;
  } catch (error) {
    console.error(error);
    return {currentDeals, currentPagination};
  }
};

/**
 * Render list of deals
 * @param  {Array} deals
 */
const renderDeals = deals => {
  const fragment = document.createDocumentFragment();
  const div = document.createElement('div');
  const template = deals
    .map(deal => {
      return `
      <div class="deal" id=${deal.uuid}>
        <span>${deal.id}</span>
        <a href="${deal.link}">${deal.title}</a>
        <span>${deal.price}</span>
      </div>
    `;
    })
    .join('');

  div.innerHTML = template;
  fragment.appendChild(div);
  sectionDeals.innerHTML = '<h2>Deals</h2>';
  sectionDeals.appendChild(fragment);
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderPagination = pagination => {
  const {currentPage, pageCount} = pagination;
  const options = Array.from(
    {'length': pageCount},
    (value, index) => `<option value="${index + 1}">${index + 1}</option>`
  ).join('');

  selectPage.innerHTML = options;
  selectPage.selectedIndex = currentPage - 1;
};

/**
 * Render lego set ids selector
 * @param  {Array} lego set ids
 */
const renderLegoSetIds = deals => {
  const ids = getIdsFromDeals(deals);
  const options = ids.map(id => 
    `<option value="${id}">${id}</option>`
  ).join('');

  selectLegoSetIds.innerHTML = options;
};

/**
 * Render page selector
 * @param  {Object} pagination
 */
const renderIndicators = pagination => {
  const {count} = pagination;

  spanNbDeals.innerHTML = count;
};

const render = (deals, pagination) => {
  renderDeals(deals);
  renderPagination(pagination);
  renderIndicators(pagination);
  renderLegoSetIds(deals)
};

/**
 * Declaration of all Listeners
 */

/**
 * Select the number of deals to display
 */
selectShow.addEventListener('change', async (event) => {
  const deals = await fetchDeals(currentPagination.currentPage, parseInt(event.target.value));

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

document.addEventListener('DOMContentLoaded', async () => {
  const deals = await fetchDeals();

  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

selectPage.addEventListener('change', async (event) => {
  const page = parseInt(event.target.value);
  const pageSize = parseInt(selectShow.value);
  const deals = await fetchDeals(page, pageSize );
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});



const fetchAllDeals = async () => {
  let allDeals = [];
  let page = 1;
  let moreDeals = true;

  while (moreDeals) {
    const { result, meta } = await fetchDeals(page, 100); 
    allDeals = allDeals.concat(result);

    if (page >= meta.pageCount) {
      moreDeals = false;
    } else {
      page++;
    }
  }

  return allDeals;
};

const filterDiscountButton = document.querySelector('#filter-discount');

filterDiscountButton.addEventListener('click', async () => {
  const allDeals = await fetchAllDeals();
  const filteredDeals = allDeals.filter(deal => deal.discount > 50);

  setCurrentDeals({ result: filteredDeals, meta: { count: filteredDeals.length, currentPage: 1, pageCount: 1 } });
  render(filteredDeals, currentPagination);
});

const filterMostCommentedButton = document.querySelector('#filter-most-commented');

filterMostCommentedButton.addEventListener('click', async () => {
  const allDeals = await fetchAllDeals();
  const filteredDeals = allDeals.filter(deal => deal.comments > 5);

  setCurrentDeals({ result: filteredDeals, meta: { count: filteredDeals.length, currentPage: 1, pageCount: 1 } });
  render(filteredDeals, currentPagination);
});

const filterHotDealsButton = document.querySelector('#filter-hot-deals');

filterHotDealsButton.addEventListener('click', async () => {
  // Fetch all deals from all pages
  const allDeals = await fetchAllDeals();

  // Filter deals with temperature > 100
  const filteredDeals = allDeals.filter(deal => deal.temperature > 100);

  // Update current deals and render
  setCurrentDeals({ result: filteredDeals, meta: { count: filteredDeals.length, currentPage: 1, pageCount: 1 } });
  render(filteredDeals, currentPagination);
});

// Gestionnaire d'événements pour le tri par prix
document.querySelector('#sort-select').addEventListener('change', async (event) => {
  const sortType = event.target.value; // Récupère la valeur de l'option sélectionnée
  const pageSize = parseInt(selectShow.value); // Nombre de deals par page sélectionné
  const currentPage = currentPagination.currentPage; // Page actuelle

  // On récupère les offres et on les trie en fonction de l'option sélectionnée
  const deals = await fetchDeals(currentPage, pageSize);

  if (sortType === 'price-asc') {
    // Trie croissant par prix
    deals.result.sort((a, b) => a.price - b.price);
  } else if (sortType === 'price-desc') {
    // Trie décroissant par prix
    deals.result.sort((a, b) => b.price - a.price);
  }

  setCurrentDeals(deals); // Met à jour les deals actuels
  render(currentDeals, currentPagination); // Rendu des deals avec pagination
});

document.querySelector('#sort-select').addEventListener('change', async (event) => {
  const sortType = event.target.value; // Récupère la valeur de l'option sélectionnée
  const pageSize = parseInt(selectShow.value); // Nombre de deals par page sélectionné
  const currentPage = currentPagination.currentPage; // Page actuelle

  // Récupère les deals à partir de l'API
  const deals = await fetchDeals(currentPage, pageSize);

  // Trie les deals en fonction du type de tri sélectionné
  if (sortType === 'date-asc') {
    // Trie croissant par date (les plus récentes en premier)
    deals.result.sort((a, b) => new Date(a.published * 1000) - new Date(b.published * 1000));
  } else if (sortType === 'date-desc') {
    // Trie décroissant par date (les plus anciennes en premier)
    deals.result.sort((a, b) => new Date(b.published * 1000) - new Date(a.published * 1000));
  }

  // Met à jour les deals après le tri
  setCurrentDeals(deals);
  render(currentDeals, currentPagination);
});

const fetchVintedSales = async (setId) => {
  try {
    const response = await fetch(`https://lego-api-blue.vercel.app/sales?id=${setId}`);
    const body = await response.json();

    if (body.success !== true) {
      console.error('Error fetching sales:', body);
      return [];
    }

    return body.data || [];
  } catch (error) {
    console.error('Error fetching sales:', error);
    return [];
  }
};

/**
 * Render Vinted sales
 * @param {Array} sales - Array of sales data
 */
const renderVintedSales = (sales) => {
  const salesSection = document.querySelector('#vinted-sales');
  const fragment = document.createDocumentFragment();

  if (sales.length === 0) {
    salesSection.innerHTML = '<p>No sales found for this set.</p>';
    return;
  }

  const salesHTML = sales
    .map(sale => {
      return `
        <div class="sale">
          <a href="${sale.link}" target="_blank">
            <img src="${sale.photo}" alt="${sale.title}" />
            <h3>${sale.title}</h3>
            <p>Price: ${sale.price}€</p>
            <p>Location: ${sale.location}</p>
            <p>Comments: ${sale.comments}</p>
          </a>
        </div>
      `;
    })
    .join('');

  fragment.innerHTML = salesHTML;
  salesSection.innerHTML = '<h2>Vinted Sales</h2>';
  salesSection.appendChild(fragment);
};

document.querySelector('#lego-set-id-select').addEventListener('change', async (event) => {
  const selectedSetId = event.target.value; // Récupère l'ID du set Lego sélectionné

  // Récupère les ventes Vinted pour ce set
  const sales = await fetchVintedSales(selectedSetId);

  // Affiche les ventes dans l'interface
  renderVintedSales(sales);
});

