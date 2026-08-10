// ============================================
// PROTOTYPE-1
// LIVE MARKET DATA ENGINE
// ============================================

const MARKET_DATA = {
  source: "KOTAK_NEO",
  status: "NOT_CONNECTED",
  lastUpdated: null,
  stocks: {}
};


// ============================================
// LIVE NEO API
// ============================================

const MARKET_API_URL =
  "/api/quotes-test";


// ============================================
// SAVE + NORMALIZE LIVE DATA
// ============================================

function saveMarketData(data) {

  if (!Array.isArray(data)) {

    console.error(
      "Invalid Neo market data:",
      data
    );

    return false;

  }


  const stocks = {};


  data.forEach(function(item) {

    if (!item) return;


    const displaySymbol =
      String(
        item.display_symbol || ""
      )
      .replace("-EQ", "")
      .trim();


    if (!displaySymbol) return;


    const price =
      Number(
        item.ltp ||
        item.last_traded_price ||
        item.price ||
        0
      );


    const change =
      Number(
        item.change ||
        item.percentage_change ||
        item.net_change_percentage ||
        0
      );


    stocks[displaySymbol] = {

      symbol:
        displaySymbol,

      price:
        price,

      change:
        change,

      exchangeToken:
        item.exchange_token || null,

      exchange:
        item.exchange || "nse_cm"

    };

  });


  MARKET_DATA.stocks =
    stocks;


  MARKET_DATA.lastUpdated =
    new Date().toISOString();


  MARKET_DATA.status =
    "LIVE";


  console.log(
    "LIVE market data loaded:",
    Object.keys(stocks).length,
    "stocks"
  );


  return true;

}


// ============================================
// GET SINGLE STOCK
// ============================================

function getMarketStock(symbol) {

  return MARKET_DATA.stocks[
    symbol
  ] || null;

}


// ============================================
// GET ALL STOCKS
// ============================================

function getAllMarketData() {

  return MARKET_DATA.stocks;

}


// ============================================
// MARKET STATUS
// ============================================

function getMarketStatus() {

  return {

    source:
      MARKET_DATA.source,

    status:
      MARKET_DATA.status,

    lastUpdated:
      MARKET_DATA.lastUpdated,

    stockCount:
      Object.keys(
        MARKET_DATA.stocks
      ).length

  };

}


// ============================================
// FETCH LIVE MARKET DATA
// ============================================

async function fetchMarketData() {

  try {

    MARKET_DATA.status =
      "LOADING";


    const response =
      await fetch(
        MARKET_API_URL,
        {
          method: "GET",
          cache: "no-store"
        }
      );


    if (!response.ok) {

      throw new Error(
        "API response error: " +
        response.status
      );

    }


    const result =
      await response.json();


    console.log(
      "Neo API response:",
      result
    );


    if (
      !result ||
      result.success !== true ||
      !Array.isArray(result.stocks)
    ) {

      throw new Error(
        "Invalid Neo API response"
      );

    }


    const success =
      saveMarketData(
        result.stocks
      );


    if (!success) {

      throw new Error(
        "Unable to save market data"
      );

    }


    return true;

  }


  catch (error) {

    console.error(
      "LIVE market data error:",
      error
    );


    MARKET_DATA.status =
      "ERROR";


    return false;

  }

}


// ============================================
// BROWSER ACCESS
// ============================================

if (
  typeof window !== "undefined"
) {

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


// ============================================
// STARTUP
// ============================================

console.log(
  "================================"
);

console.log(
  "PROTOTYPE-1 LIVE MARKET DATA ENGINE"
);

console.log(
  "API:",
  MARKET_API_URL
);

console.log(
  "================================"
);
