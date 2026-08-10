// ============================================
// PROTOTYPE-1
// MARKET DATA ENGINE
// LIVE KOTAK NEO MARKET DATA
// ============================================

const MARKET_DATA = {
  source: "KOTAK NEO",
  status: "NOT_CONNECTED",
  lastUpdated: null,
  stocks: {}
};


// ============================================
// API CONFIGURATION
// ============================================

const MARKET_API_URL = "/api/quotes-test";


// ============================================
// STOCK SYMBOL NORMALIZER
// ============================================

function normalizeSymbol(symbol) {

  if (!symbol) return "";

  return String(symbol)
    .replace("-EQ", "")
    .trim()
    .toUpperCase();

}


// ============================================
// NUMBER HELPER
// ============================================

function toNumber(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number =
    Number(
      String(value).replace(/,/g, "")
    );

  return Number.isFinite(number)
    ? number
    : 0;

}


// ============================================
// CONVERT NEO RESPONSE
// ============================================

function normalizeNeoQuote(quote) {

  if (!quote || typeof quote !== "object") {
    return null;
  }


  // -------------------------------
  // SYMBOL
  // -------------------------------

  const symbol =
    normalizeSymbol(
      quote.display_symbol ||
      quote.symbol ||
      quote.trading_symbol ||
      quote.neo_symbol
    );


  if (!symbol) {
    return null;
  }


  // -------------------------------
  // LIVE PRICE
  // -------------------------------

  const price =
    toNumber(
      quote.ltp ??
      quote.last_price ??
      quote.lastPrice ??
      quote.close_price ??
      quote.close
    );


  if (price <= 0) {
    return null;
  }


  // -------------------------------
  // DIRECT PERCENTAGE CHANGE
  // -------------------------------

  let percentChange =
    toNumber(
      quote.percentage_change ??
      quote.percent_change ??
      quote.percentChange ??
      quote.change_percent ??
      quote.changePercent
    );


  // -------------------------------
  // IF PERCENTAGE NOT PROVIDED,
  // CALCULATE FROM PRICE + PREVIOUS CLOSE
  // -------------------------------

  if (
    !Number.isFinite(percentChange) ||
    percentChange === 0
  ) {

    const previousClose =
      toNumber(
        quote.previous_close ??
        quote.prev_close ??
        quote.prevClose ??
        quote.previousClose ??
        quote.pc
      );


    if (previousClose > 0) {

      percentChange =
        (
          (price - previousClose) /
          previousClose
        ) * 100;

    }

  }


  // -------------------------------
  // LAST CHANGE IN RUPEES
  // -------------------------------

  let rupeeChange =
    toNumber(
      quote.net_change ??
      quote.netChange ??
      quote.change ??
      quote.chg
    );


  // Calculate rupee change if necessary

  if (
    rupeeChange === 0 &&
    percentChange !== 0
  ) {

    const previousClose =
      toNumber(
        quote.previous_close ??
        quote.prev_close ??
        quote.prevClose ??
        quote.previousClose ??
        quote.pc
      );


    if (previousClose > 0) {

      rupeeChange =
        price - previousClose;

    }

  }


  return {

    symbol: symbol,

    price: price,

    // IMPORTANT:
    // This is percentage change,
    // NOT rupee change.

    change:
      Number(
        percentChange.toFixed(2)
      ),

    rupeeChange:
      Number(
        rupeeChange.toFixed(2)
      )

  };

}


// ============================================
// SAVE RECEIVED MARKET DATA
// ============================================

function saveMarketData(data) {

  if (!data) {

    console.error(
      "Invalid market data"
    );

    return false;

  }


  let quotes = [];


  // -------------------------------
  // DIFFERENT API RESPONSE FORMATS
  // -------------------------------

  if (Array.isArray(data)) {

    quotes = data;

  }

  else if (
    Array.isArray(data.data)
  ) {

    quotes = data.data;

  }

  else if (
    Array.isArray(data.stocks)
  ) {

    quotes = data.stocks;

  }

  else if (
    Array.isArray(data.quotes)
  ) {

    quotes = data.quotes;

  }


  // -------------------------------
  // CONVERT QUOTES
  // -------------------------------

  const normalized = {};


  quotes.forEach(
    function(quote) {

      const result =
        normalizeNeoQuote(quote);


      if (!result) {
        return;
      }


      normalized[
        result.symbol
      ] = {

        price:
          result.price,

        change:
          result.change,

        rupeeChange:
          result.rupeeChange

      };

    }
  );


  if (
    Object.keys(normalized).length === 0
  ) {

    console.error(
      "No valid Neo quotes found.",
      data
    );

    MARKET_DATA.status =
      "ERROR";

    return false;

  }


  MARKET_DATA.stocks =
    normalized;


  MARKET_DATA.lastUpdated =
    new Date().toISOString();


  MARKET_DATA.status =
    "LIVE_DATA_LOADED";


  console.log(
    "LIVE market data loaded:",
    Object.keys(normalized).length,
    "stocks"
  );


  return true;

}


// ============================================
// GET SINGLE STOCK
// ============================================

function getMarketStock(symbol) {

  const key =
    normalizeSymbol(symbol);


  return (
    MARKET_DATA.stocks[key] ||
    null
  );

}


// ============================================
// GET ALL MARKET DATA
// ============================================

function getAllMarketData() {

  return MARKET_DATA.stocks;

}


// ============================================
// GET MARKET STATUS
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
// FETCH REAL MARKET DATA
// ============================================

async function fetchMarketData() {

  if (!MARKET_API_URL) {

    console.warn(
      "Market API is not configured."
    );

    MARKET_DATA.status =
      "API_NOT_CONFIGURED";

    return false;

  }


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


    const data =
      await response.json();


    const success =
      saveMarketData(data);


    if (!success) {

      MARKET_DATA.status =
        "ERROR";

      return false;

    }


    return true;

  }


  catch (error) {

    console.error(
      "Market data error:",
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
  "PROTOTYPE-1 MARKET DATA ENGINE"
);

console.log(
  "Source: KOTAK NEO"
);

console.log(
  "Status:",
  MARKET_DATA.status
);

console.log(
  "================================"
);
