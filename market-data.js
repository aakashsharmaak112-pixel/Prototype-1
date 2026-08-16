// ============================================
// PROTOTYPE-1
// FRONTEND MARKET DATA CLIENT
// ============================================

const MARKET_DATA_API = "/api/quotes";

window.MARKET_DATA = {
  success: false,
  source: null,
  stocks: {},
  top20: [],
  totalStocks: 0,
  fetchedAt: null
};


// ============================================
// FETCH LIVE MARKET DATA
// ============================================

async function fetchMarketData() {

  console.log(
    "Fetching:",
    MARKET_DATA_API
  );

  try {

    const response = await fetch(
      MARKET_DATA_API,
      {
        method: "GET",
        headers: {
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );


    const data = await response.json();

    console.log(
      "Market Data Response:",
      data
    );


    if (
      !response.ok ||
      !data.success
    ) {

      console.error(
        "Market API failed:",
        data
      );

      window.MARKET_DATA.success =
        false;

      return false;
    }


    if (
      !Array.isArray(data.stocks)
    ) {

      console.error(
        "stocks array missing"
      );

      return false;
    }


    // ----------------------------------------
    // ARRAY → SYMBOL MAP
    // ----------------------------------------

    const stocks = {};


    data.stocks.forEach(
      function(stock) {

        if (
          !stock ||
          !stock.symbol
        ) {
          return;
        }


        const price =
          Number(stock.ltp) || 0;

        const percentChange =
          Number(stock.perChange) || 0;


        stocks[stock.symbol] = {

          symbol:
            stock.symbol,

          token:
            stock.token,

          exchange:
            stock.exchange,

          displaySymbol:
            stock.displaySymbol,

          price:
            price,

          ltp:
            price,

          change:
            percentChange,

          perChange:
            percentChange,

          absoluteChange:
            Number(stock.change) || 0,

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

      }
    );


    // ----------------------------------------
    // SAVE GLOBAL DATA
    // ----------------------------------------

    window.MARKET_DATA = {

      success:
        true,

      source:
        data.source || "KOTAK NEO",

      stocks:
        stocks,

      top20:
        Array.isArray(data.top20)
          ? data.top20
          : [],

      totalStocks:
        Object.keys(stocks).length,

      fetchedAt:
        data.fetchedAt || null

    };


    console.log(
      "LIVE MARKET DATA LOADED:",
      window.MARKET_DATA.totalStocks
    );


    return true;

  }

  catch (error) {

    console.error(
      "fetchMarketData error:",
      error
    );

    window.MARKET_DATA.success =
      false;

    return false;

  }

}


// ============================================
// MARKET DATA ACCESS
// ============================================

function getMarketData() {

  return window.MARKET_DATA &&
         window.MARKET_DATA.stocks
    ? window.MARKET_DATA.stocks
    : {};

}


function getMarketStock(symbol) {

  const stocks =
    getMarketData();

  return stocks[symbol] || null;

}


function getAllMarketData() {

  return getMarketData();

}


function getMarketStatus() {

  const stocks =
    getMarketData();

  return {

    connected:
      window.MARKET_DATA?.success === true,

    stockCount:
      Object.keys(stocks).length,

    source:
      window.MARKET_DATA?.source || null,

    fetchedAt:
      window.MARKET_DATA?.fetchedAt || null

  };

}


// ============================================
// EXPOSE FUNCTIONS
// ============================================

window.fetchMarketData =
  fetchMarketData;

window.getMarketData =
  getMarketData;

window.getMarketStock =
  getMarketStock;

window.getAllMarketData =
  getAllMarketData;

window.getMarketStatus =
  getMarketStatus;


console.log(
  "Prototype-1 frontend market-data.js READY"
);
