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

const MARKET_API_URL = "/api/quotes";


// ============================================
// SYMBOL NORMALIZER
// ============================================

function normalizeSymbol(symbol) {

  if (!symbol) return "";

  return String(symbol)
    .replace(/-EQ$/i, "")
    .trim()
    .toUpperCase();

}


// ============================================
// NUMBER CONVERTER
// ============================================

function toNumber(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(
    String(value)
      .replace(/,/g, "")
      .replace(/%/g, "")
      .trim()
  );

  return Number.isFinite(number)
    ? number
    : 0;

}


// ============================================
// FIND QUOTES ARRAY
// ============================================

function extractQuotes(data) {

  if (!data) {
    return [];
  }

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data.quotes)) {
    return data.quotes;
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (Array.isArray(data.stocks)) {
    return data.stocks;
  }

  if (Array.isArray(data.results)) {
    return data.results;
  }

  if (Array.isArray(data.result)) {
    return data.result;
  }

  return [];
}


// ============================================
// NORMALIZE KOTAK NEO QUOTE
// ============================================

function normalizeNeoQuote(quote) {

  if (!quote || typeof quote !== "object") {
    return null;
  }


  const symbol = normalizeSymbol(
    quote.display_symbol ||
    quote.symbol ||
    quote.trading_symbol ||
    quote.neo_symbol
  );


  if (!symbol) {
    return null;
  }


  const price = toNumber(
    quote.ltp ??
    quote.last_price ??
    quote.lastPrice ??
    quote.close_price ??
    quote.close ??
    quote.LTP
  );


  if (price <= 0) {
    return null;
  }


  const previousClose = toNumber(
    quote.previous_close ??
    quote.prev_close ??
    quote.prevClose ??
    quote.previousClose ??
    quote.pc ??
    quote.PREVIOUS_CLOSE
  );


  let percentChange = toNumber(
    quote.percentage_change ??
    quote.percent_change ??
    quote.percentChange ??
    quote.change_percent ??
    quote.changePercent ??
    quote.pChange ??
    quote.PERCENTAGE_CHANGE
  );


  if (
    previousClose > 0 &&
    price > 0
  ) {

    percentChange =
      ((price - previousClose) / previousClose) * 100;

  }


  let rupeeChange = toNumber(
    quote.net_change ??
    quote.netChange ??
    quote.change ??
    quote.chg ??
    quote.NET_CHANGE
  );


  if (
    previousClose > 0 &&
    price > 0
  ) {

    rupeeChange =
      price - previousClose;

  }


  return {

    symbol: symbol,

    price: Number(
      price.toFixed(2)
    ),

    change: Number(
      percentChange.toFixed(2)
    ),

    rupeeChange: Number(
      rupeeChange.toFixed(2)
    )

  };

}


// ============================================
// SAVE MARKET DATA
// ============================================

function saveMarketData(data) {

  if (!data) {

    console.error(
      "Invalid market data response."
    );

    MARKET_DATA.status = "ERROR";

    return false;

  }


  const quotes = extractQuotes(data);


  if (!quotes.length) {

    console.error(
      "No quotes array found in API response.",
      data
    );

    MARKET_DATA.status = "ERROR";

    return false;

  }


  const normalized = {};


  quotes.forEach(function(quote) {

    const result =
      normalizeNeoQuote(quote);


    if (!result) {
      return;
    }


    normalized[result.symbol] = {

      price: result.price,

      change: result.change,

      rupeeChange: result.rupeeChange

    };

  });


  const stockCount =
    Object.keys(normalized).length;


  if (stockCount === 0) {

    console.error(
      "Quotes received but no valid stock prices found.",
      quotes
    );

    MARKET_DATA.status = "ERROR";

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
    stockCount,
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
          cache: "no-store",
          headers: {
            Accept: "application/json"
          }
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


    console.log(
      "Quotes API response:",
      data
    );


    if (
      data &&
      data.success === false
    ) {

      throw new Error(
        data.error ||
        "Quotes API returned success=false"
      );

    }


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
  "API: /api/quotes"
);

console.log(
  "Status:",
  MARKET_DATA.status
);

console.log(
  "================================"
);
