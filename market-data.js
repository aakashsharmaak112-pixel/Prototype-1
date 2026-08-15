// ============================================
// PROTOTYPE-1
// MARKET DATA CLIENT
// FRONTEND
// ============================================

const MARKET_DATA_API =
  "/api/market-data";

window.MARKET_DATA = {
  stocks: {},
  top20: [],
  status: "CONNECTING"
};


// ============================================
// FETCH LIVE MARKET DATA
// ============================================

async function fetchMarketData() {

  try {

    window.MARKET_DATA.status =
      "LOADING";

    const response =
      await fetch(
        MARKET_DATA_API,
        {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        }
      );

    if (!response.ok) {

      console.error(
        "Market Data API HTTP error:",
        response.status
      );

      window.MARKET_DATA.status =
        "ERROR";

      return false;
    }


    const data =
      await response.json();


    if (
      !data ||
      !data.success ||
      !Array.isArray(data.stocks)
    ) {

      console.error(
        "Invalid market data response:",
        data
      );

      window.MARKET_DATA.status =
        "ERROR";

      return false;
    }


    // ----------------------------------------
    // CONVERT STOCK ARRAY → OBJECT
    // ----------------------------------------

    const stockMap = {};


    data.stocks.forEach(
      function(stock) {

        if (!stock || !stock.symbol) {
          return;
        }


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
            Number(stock.ltp) || 0,

          ltp:
            Number(stock.ltp) || 0,

          change:
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

      }
    );


    // ----------------------------------------
    // SAVE GLOBAL DATA
    // ----------------------------------------

    window.MARKET_DATA = {

      stocks:
        stockMap,

      top20:
        Array.isArray(data.top20)
          ? data.top20
          : [],

      totalStocks:
        data.totalStocks || 0,

      marketSummary:
        data.marketSummary || {},

      fetchedAt:
        data.fetchedAt || null,

      status:
        "LIVE"

    };


    console.log(
      "LIVE MARKET DATA:",
      data.totalStocks,
      "stocks"
    );


    return true;

  }

  catch (error) {

    console.error(
      "fetchMarketData() failed:",
      error
    );


    window.MARKET_DATA.status =
      "ERROR";

    return false;

  }

}


// ============================================
// MARKET STATUS
// ============================================

function getMarketStatus() {

  const stocks =
    window.MARKET_DATA &&
    window.MARKET_DATA.stocks
      ? window.MARKET_DATA.stocks
      : {};


  return {

    status:
      window.MARKET_DATA.status,

    stockCount:
      Object.keys(stocks).length,

    top20Count:
      Array.isArray(window.MARKET_DATA.top20)
        ? window.MARKET_DATA.top20.length
        : 0

  };

}


// ============================================
// BROWSER ACCESS
// ============================================

window.fetchMarketData =
  fetchMarketData;

window.getMarketStatus =
  getMarketStatus;


// ============================================
// STARTUP
// ============================================

console.log(
  "Prototype-1 market-data.js loaded."
);
