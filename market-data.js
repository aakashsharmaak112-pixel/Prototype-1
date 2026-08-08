// ============================================
// PROTOTYPE-1
// MARKET DATA LAYER
// Step 2: Market Data Structure
// ============================================

const MARKET_DATA = {
  source: "Pending",
  status: "NOT_CONNECTED",
  lastUpdated: null,
  stocks: {}
};


// --------------------------------------------
// Save market data
// --------------------------------------------

function saveMarketData(data) {

  if (!data || typeof data !== "object") {
    console.error("Invalid market data");
    return false;
  }

  MARKET_DATA.stocks = data;
  MARKET_DATA.lastUpdated = new Date().toISOString();
  MARKET_DATA.status = "LOADED";

  console.log("Market data loaded:", MARKET_DATA);

  return true;
}


// --------------------------------------------
// Get one stock
// --------------------------------------------

function getMarketStock(symbol) {

  return MARKET_DATA.stocks[symbol] || null;
}


// --------------------------------------------
// Get all market data
// --------------------------------------------

function getAllMarketData() {

  return MARKET_DATA.stocks;
}


// --------------------------------------------
// Market status
// --------------------------------------------

function getMarketStatus() {

  return {
    source: MARKET_DATA.source,
    status: MARKET_DATA.status,
    lastUpdated: MARKET_DATA.lastUpdated,
    stockCount: Object.keys(MARKET_DATA.stocks).length
  };

}


// --------------------------------------------
// Temporary test data
// --------------------------------------------
// IMPORTANT:
// These are TEST values only.
// They are NOT live market prices.
// Real market API will be connected next.

const TEST_MARKET_DATA = {

  HDFCBANK: {
    price: 0,
    change: 0
  },

  RELIANCE: {
    price: 0,
    change: 0
  },

  ICICIBANK: {
    price: 0,
    change: 0
  },

  INFY: {
    price: 0,
    change: 0
  },

  SBIN: {
    price: 0,
    change: 0
  }

};


// --------------------------------------------
// Make functions available to the app
// --------------------------------------------

if (typeof window !== "undefined") {

  window.MARKET_DATA = MARKET_DATA;

  window.saveMarketData = saveMarketData;

  window.getMarketStock = getMarketStock;

  window.getAllMarketData = getAllMarketData;

  window.getMarketStatus = getMarketStatus;

  window.TEST_MARKET_DATA = TEST_MARKET_DATA;

}


// --------------------------------------------
// Engine startup
// --------------------------------------------

console.log("--------------------------------
            
