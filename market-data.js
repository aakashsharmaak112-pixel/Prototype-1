// ============================================
// PROTOTYPE-1
// MARKET DATA CLIENT
// ROOT: market-data.js
// ============================================

const MARKET_API_URL = "/api/market-data";

const MARKET_DATA = {
  stocks: {},
  lastUpdated: null,
  source: null,
  stockCount: 0,
  success: false
};


// ============================================
// SAVE MARKET DATA
// ============================================

function saveMarketData(data) {

  if (!data || !Array.isArray(data.stocks)) {
    return false;
  }

  const stocks = {};

  data.stocks.forEach(function (stock) {

    if (!stock || !stock.symbol) {
      return;
    }

    stocks[stock.symbol] = {

      symbol: stock.symbol,

      token:
        stock.token || "",

      exchange:
        stock.exchange || "",

      displaySymbol:
        stock.displaySymbol || stock.symbol,

      // app.js expects these names
      price:
        Number(stock.ltp) || 0,

      // Percentage change
      change:
        Number(stock.perChange) || 0,

      // Original Kotak values
      ltp:
        Number(stock.ltp) || 0,

      absoluteChange:
        Number(stock.change) || 0,

      perChange:
        Number(stock.perChange) || 0,

      open:
        Number(stock.open) || 0,

      high:
        Number(stock.high) || 0,

      low:
        Number(stock.low) || 0,

      close:
        Number(stock.close) || 0,

      yearHigh:
        Number(stock.yearHigh) || 0,

      yearLow:
        Number(stock.yearLow) || 0,

      lastTradedQuantity:
        Number(stock.lastTradedQuantity) || 0,

      avgCost:
        Number(stock.avgCost) || 0,

      lastUpdated:
        stock.lastUpdated || null
    };

  });


  MARKET_DATA.stocks =
    stocks;

  MARKET_DATA.stockCount =
    Object.keys(stocks).length;

  MARKET_DATA.lastUpdated =
    data.fetchedAt ||
    new Date().toISOString();

  MARKET_DATA.source =
    data.source ||
    "KOTAK NEO";

  MARKET_DATA.success =
    true;

  return true;
}


// ============================================
// FETCH LIVE MARKET DATA
// ============================================

async function fetchMarketData() {

  try {

    console.log(
      "Prototype-1: fetching /api/market-data"
    );


    const response =
      await fetch(
        MARKET_API_URL,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json"
          },

          cache: "no-store"
        }
      );


    const text =
      await response.text();


    let data;


    try {

      data =
        JSON.parse(text);

    } catch (parseError) {

      console.error(
        "Prototype-1: market-data returned non-JSON:",
        text
      );

      MARKET_DATA.success =
        false;

      return false;
    }


    if (
      !response.ok ||
      !data.success
    ) {

      console.error(
        "Prototype-1: market-data API failed:",
        data
      );

      MARKET_DATA.success =
        false;

      return false;
    }


    const saved =
      saveMarketData(data);


    if (!saved) {

      console.error(
        "Prototype-1: invalid market data response."
      );

      MARKET_DATA.success =
        false;

      return false;
    }


    console.log(
      "Prototype-1: live market data loaded:",
      MARKET_DATA.stockCount,
      "stocks"
    );


    return (
      MARKET_DATA.stockCount > 0
    );

  } catch (error) {

    console.error(
      "Prototype-1: fetchMarketData error:",
      error
    );

    MARKET_DATA.success =
      false;

    return false;
  }
}


// ============================================
// GET MARKET STATUS
// ============================================

function getMarketStatus() {

  return {

    success:
      MARKET_DATA.success,

    stockCount:
      MARKET_DATA.stockCount,

    source:
      MARKET_DATA.source,

    lastUpdated:
      MARKET_DATA.lastUpdated
  };
}


// ============================================
// GET ALL MARKET DATA
// ============================================

function getAllMarketData() {

  return MARKET_DATA.stocks;

}


// ============================================
// GET ONE STOCK
// ============================================

function getMarketStock(symbol) {

  return (
    MARKET_DATA.stocks[symbol] ||
    null
  );

}


// ============================================
// BROWSER GLOBALS
// ============================================

if (
  typeof window !== "undefined"
) {

  window.MARKET_DATA =
    MARKET_DATA;

  window.fetchMarketData =
    fetchMarketData;

  window.getMarketStatus =
    getMarketStatus;

  window.getAllMarketData =
    getAllMarketData;

  window.getMarketStock =
    getMarketStock;
}


// ============================================
// STARTUP
// ============================================

console.log(
  "Prototype-1 market-data.js loaded."
);
