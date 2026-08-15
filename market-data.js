// ============================================
// PROTOTYPE-1
// MARKET DATA CLIENT
// LIVE KOTAK NEO DATA
// ============================================

const MARKET_DATA_API =
  "/api/market-data";

// ============================================
// MARKET DATA STATE
// ============================================

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
    "Fetching live market data from:",
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


    const data =
      await response.json();


    console.log(
      "MARKET DATA API RESPONSE:",
      data
    );


    // ----------------------------------------
    // API ERROR
    // ----------------------------------------

    if (
      !response.ok ||
      !data.success
    ) {

      console.error(
        "Market Data API Error:",
        data
      );

      window.MARKET_DATA.success =
        false;

      return false;
    }


    // ----------------------------------------
    // VALIDATE STOCK ARRAY
    // ----------------------------------------

    if (
      !Array.isArray(data.stocks)
    ) {

      console.error(
        "stocks array missing:",
        data
      );

      window.MARKET_DATA.success =
        false;

      return false;
    }


    // ----------------------------------------
    // CONVERT ARRAY → SYMBOL MAP
    // ----------------------------------------

    const stockMap = {};


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


        const change =
          Number(stock.perChange) || 0;


        stockMap[stock.symbol] = {

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
            change,

          perChange:
            change,

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
            Number(
              stock.lastTradedQuantity
            ) || 0,

          avgCost:
            Number(stock.avgCost) || 0,

          lastUpdated:
            stock.lastUpdated || null

        };

      }
    );


    // ----------------------------------------
    // SAVE GLOBAL MARKET DATA
    // ----------------------------------------

    window.MARKET_DATA = {

      success:
        true,

      source:
        data.source || "KOTAK NEO",

      stocks:
        stockMap,

      top20:
        Array.isArray(data.top20)
          ? data.top20
          : [],

      totalStocks:
        Object.keys(stockMap).length,

      fetchedAt:
        data.fetchedAt || null

    };


    console.log(
      "LIVE MARKET DATA LOADED:",
      window.MARKET_DATA.totalStocks,
      "stocks"
    );


    // ----------------------------------------
    // VERIFY 50 STOCKS
    // ----------------------------------------

    if (
      window.MARKET_DATA.totalStocks !== 50
    ) {

      console.warn(
        "Expected 50 stocks but received:",
        window.MARKET_DATA.totalStocks
      );

    }


    return true;

  }

  catch (error) {

    console.error(
      "fetchMarketData() failed:",
      error
    );


    window.MARKET_DATA.success =
      false;


    return false;

  }

}


// ============================================
// GET MARKET DATA
// ============================================

function getMarketData() {

  return (
    window.MARKET_DATA &&
    window.MARKET_DATA.stocks
  )
    ? window.MARKET_DATA.stocks
    : {};

}


// ============================================
// GET MARKET STATUS
// ============================================

function getMarketStatus() {

  const stocks =
    getMarketData();


  return {

    connected:
      window.MARKET_DATA?.success === true,

    stockCount:
      Object.keys(stocks).length,

    source:
      window.MARKET_DATA?.source ||
      null,

    fetchedAt:
      window.MARKET_DATA?.fetchedAt ||
      null

  };

}


// ============================================
// GET SINGLE STOCK
// ============================================

function getMarketStock(symbol) {

  const stocks =
    getMarketData();


  return (
    stocks[symbol] ||
    null
  );

}


// ============================================
// GET ALL STOCKS
// ============================================

function getAllMarketData() {

  return getMarketData();

}


// ============================================
// BROWSER ACCESS
// ============================================

window.fetchMarketData =
  fetchMarketData;

window.getMarketData =
  getMarketData;

window.getMarketStatus =
  getMarketStatus;

window.getMarketStock =
  getMarketStock;

window.getAllMarketData =
  getAllMarketData;


// ============================================
// STARTUP LOG
// ============================================

console.log(
  "================================"
);

console.log(
  "PROTOTYPE-1 MARKET DATA CLIENT"
);

console.log(
  "API:",
  MARKET_DATA_API
);

console.log(
  "fetchMarketData(): READY"
);

console.log(
  "================================"
);
