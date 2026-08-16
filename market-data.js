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

async function fetchMarketData(totp) {

  console.log(
    "Prototype-1: Fetching live market data:",
    MARKET_DATA_API
  );

  try {

    console.log(
      "TOTP received:",
      Boolean(totp)
    );

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

    const text = await response.text();

    console.log(
      "Kotak Neo API response:",
      text
    );

    let data = null;

    try {
      data = text
        ? JSON.parse(text)
        : null;
    } catch (error) {

      console.error(
        "Invalid JSON response:",
        error
      );

      window.MARKET_DATA.success = false;

      return false;
    }


    if (
      !response.ok ||
      !data ||
      !data.success
    ) {

      console.error(
        "Market API failed:",
        data
      );

      window.MARKET_DATA.success = false;

      return false;
    }


    if (
      !Array.isArray(data.stocks)
    ) {

      console.error(
        "stocks array missing"
      );

      window.MARKET_DATA.success = false;

      return false;
    }


    // ========================================
    // ARRAY → SYMBOL MAP
    // ========================================

    const stocks = {};


    data.stocks.forEach(function (stock) {

      if (
        !stock ||
        !stock.symbol
      ) {
        return;
      }


      const symbol = String(
        stock.symbol
      )
        .replace(/-EQ$/i, "")
        .trim()
        .toUpperCase();


      if (!symbol) {
        return;
      }


      const price =
        Number(stock.ltp) || 0;


      const percentChange =
        Number(stock.perChange) || 0;


      stocks[symbol] = {

        symbol: symbol,

        token:
          stock.token || null,

        exchange:
          stock.exchange || "nse_cm",

        displaySymbol:
          stock.displaySymbol ||
          `${symbol}-EQ`,

        price: price,

        ltp: price,

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
          Number(
            stock.lastTradedQuantity
          ) || 0,

        avgCost:
          Number(stock.avgCost) || 0,

        lastUpdated:
          stock.lastUpdated || null
      };

    });


    // ========================================
    // SAVE GLOBAL DATA
    // ========================================

    window.MARKET_DATA = {

      success: true,

      source:
        data.source ||
        "KOTAK NEO",

      stocks: stocks,

      top20:
        Array.isArray(data.top20)
          ? data.top20
          : [],

      totalStocks:
        Object.keys(stocks).length,

      fetchedAt:
        data.fetchedAt ||
        new Date().toISOString()
    };


    console.log(
      "===================================="
    );

    console.log(
      "LIVE MARKET DATA LOADED"
    );

    console.log(
      "Source:",
      window.MARKET_DATA.source
    );

    console.log(
      "Stocks:",
      window.MARKET_DATA.totalStocks
    );

    console.log(
      "===================================="
    );


    if (
      window.MARKET_DATA.totalStocks === 0
    ) {

      console.error(
        "No valid market stocks found."
      );

      window.MARKET_DATA.success = false;

      return false;
    }


    return true;

  } catch (error) {

    console.error(
      "fetchMarketData error:",
      error
    );

    window.MARKET_DATA.success = false;

    return false;
  }
}


// ============================================
// MARKET DATA ACCESS
// ============================================

function getMarketData() {

  if (
    window.MARKET_DATA &&
    window.MARKET_DATA.stocks
  ) {

    return window.MARKET_DATA.stocks;
  }

  return {};
}


// ============================================
// SINGLE STOCK
// ============================================

function getMarketStock(symbol) {

  const stocks =
    getMarketData();


  const key =
    String(symbol || "")
      .replace(/-EQ$/i, "")
      .trim()
      .toUpperCase();


  return stocks[key] || null;
}


// ============================================
// ALL MARKET DATA
// ============================================

function getAllMarketData() {

  return getMarketData();
}


// ============================================
// MARKET STATUS
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


// ============================================
// READY
// ============================================

console.log(
  "Prototype-1 root market-data.js READY"
);

console.log(
  "Market API:",
  MARKET_DATA_API
);
