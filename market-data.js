// ============================================
// PROTOTYPE-1
// MARKET DATA ENGINE
// ============================================

const MARKET_DATA = {
  source: "TEST",
  status: "NOT_CONNECTED",
  lastUpdated: null,
  stocks: {}
};


// --------------------------------------------
// API CONFIGURATION
// --------------------------------------------

const MARKET_API_URL = "";


// --------------------------------------------
// Save received market data
// --------------------------------------------

function saveMarketData(data) {

  if (!data || typeof data !== "object") {

    console.error("Invalid market data");

    return false;

  }

  MARKET_DATA.stocks = data;

  MARKET_DATA.lastUpdated =
    new Date().toISOString();

  MARKET_DATA.status =
    "LIVE_DATA_LOADED";

  console.log(
    "Market data loaded:",
    Object.keys(data).length,
    "stocks"
  );

  return true;

}


// --------------------------------------------
// Get single stock
// --------------------------------------------

function getMarketStock(symbol) {

  return MARKET_DATA.stocks[symbol] || null;

}


// --------------------------------------------
// Get all stocks
// --------------------------------------------

function getAllMarketData() {

  return MARKET_DATA.stocks;

}


// --------------------------------------------
// Get market status
// --------------------------------------------

function getMarketStatus() {

  return {

    source: MARKET_DATA.source,

    status: MARKET_DATA.status,

    lastUpdated:
      MARKET_DATA.lastUpdated,

    stockCount:
      Object.keys(
        MARKET_DATA.stocks
      ).length

  };

}


// --------------------------------------------
// Fetch real market data
// --------------------------------------------

async function fetchMarketData() {

  if (!MARKET_API_URL) {

    console.warn(
      "Market API is not configured yet."
    );

    MARKET_DATA.status =
      "API_NOT_CONFIGURED";

    return false;

  }


  try {

    MARKET_DATA.status =
      "LOADING";


    const response =
      await fetch(MARKET_API_URL);


    if (!response.ok) {

      throw new Error(
        "API response error: " +
        response.status
      );

    }


    const data =
      await response.json();


    saveMarketData(data);

    return true;


  } catch (error) {

    console.error(
      "Market data error:",
      error
    );

    MARKET_DATA.status =
      "ERROR";

    return false;

  }

}


// --------------------------------------------
// Make engine available to browser
// --------------------------------------------

if (typeof window !== "undefined") {

  window.MARKET_DATA =
    MARKET_DATA;

  window.saveMarketData =
    saveMarketData;

  window.getMarketStock =
    getMarketStock;

  window.getAllMarketData =
    getAllMarketData;

  window.getMarketStatus =
    getMarketStatus;

  window.fetchMarketData =
    fetchMarketData;

}


// --------------------------------------------
// Startup
// --------------------------------------------

console.log(
  "--------------------------------"
);

console.log(
  "PROTOTYPE-1 MARKET DATA ENGINE"
);

console.log(
  "Status:",
  MARKET_DATA.status
);

console.log(
  "--------------------------------"
);
