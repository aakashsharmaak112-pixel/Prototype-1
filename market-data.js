// ============================================
// PROTOTYPE-1
// MARKET DATA ENGINE
// LIVE KOTAK NEO QUOTES
// ============================================

const MARKET_DATA = {
  source: "KOTAK_NEO",
  status: "NOT_CONNECTED",
  lastUpdated: null,
  stocks: {}
};


// --------------------------------------------
// API CONFIGURATION
// --------------------------------------------

const MARKET_API_URL = "/api/quotes-test";


// --------------------------------------------
// Normalize Neo quote
// --------------------------------------------

function normalizeQuote(quote) {

  if (!quote || typeof quote !== "object") {
    return null;
  }

  const displaySymbol =
    quote.display_symbol ||
    quote.symbol ||
    "";

  // Example:
  // MARUTI-EQ -> MARUTI
  const symbol =
    displaySymbol
      .replace("-EQ", "")
      .trim();

  if (!symbol) {
    return null;
  }

  const price =
    Number(
      quote.ltp ||
      quote.last_price ||
      quote.price ||
      0
    );

  let change =
    Number(
      quote.change_percentage ??
      quote.percent_change ??
      quote.changePercent ??
      quote.change ??
      0
    );

  // Some APIs may return absolute change.
  // If percent change is unavailable, keep the
  // received value rather than inventing one.

  if (!Number.isFinite(change)) {
    change = 0;
  }

  return {
    symbol: symbol,
    displaySymbol: displaySymbol,
    price: price,
    change: change,

    exchangeToken:
      quote.exchange_token || null,

    exchange:
      quote.exchange || "nse_cm",

    lastUpdated:
      quote.lstup_time || null,

    raw: quote
  };

}


// --------------------------------------------
// Convert API response into app data
// --------------------------------------------

function parseMarketResponse(responseData) {

  if (!responseData || typeof responseData !== "object") {

    console.error(
      "Invalid market API response"
    );

    return {};

  }


  // Expected response:
  //
  // {
  //   success: true,
  //   totalRequested: 50,
  //   totalReceived: 50,
  //   totalErrors: 0,
  //   stocks: [...]
  // }

  const quotes =
    Array.isArray(responseData.stocks)
      ? responseData.stocks
      : [];


  const marketStocks = {};


  quotes.forEach(
    function(quote) {

      const normalized =
        normalizeQuote(quote);


      if (!normalized) {
        return;
      }


      marketStocks[
        normalized.symbol
      ] = normalized;

    }
  );


  return marketStocks;

}


// --------------------------------------------
// Save received market data
// --------------------------------------------

function saveMarketData(data) {

  if (!data || typeof data !== "object") {

    console.error(
      "Invalid market data"
    );

    return false;

  }


  const parsedData =
    parseMarketResponse(data);


  if (
    !parsedData ||
    Object.keys(parsedData).length === 0
  ) {

    console.error(
      "No valid quote data received."
    );

    MARKET_DATA.status =
      "NO_DATA";

    return false;

  }


  MARKET_DATA.stocks =
    parsedData;


  MARKET_DATA.lastUpdated =
    new Date().toISOString();


  MARKET_DATA.status =
    "LIVE";


  console.log(
    "Live market data loaded:",
    Object.keys(
      parsedData
    ).length,
    "stocks"
  );


  return true;

}


// --------------------------------------------
// Get single stock
// --------------------------------------------

function getMarketStock(symbol) {

  if (!symbol) {
    return null;
  }


  return (
    MARKET_DATA.stocks[
      symbol
    ] || null
  );

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


// --------------------------------------------
// Fetch real market data
// --------------------------------------------

async function fetchMarketData() {

  try {

    MARKET_DATA.status =
      "LOADING";


    console.log(
      "Fetching live market data..."
    );


    const response =
      await fetch(
        MARKET_API_URL,
        {
          method: "GET",
          headers: {
            "Accept":
              "application/json"
          },
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


    // Verify backend result

    if (
      data.success !== true
    ) {

      throw new Error(
        data.error ||
        "Market API returned unsuccessful response"
      );

    }


    // Safety check

    if (
      data.totalReceived !==
      data.totalRequested
    ) {

      console.warn(
        "Not all requested stocks received:",
        data.totalReceived,
        "/",
        data.totalRequested
      );

    }


    const saved =
      saveMarketData(data);


    if (!saved) {

      throw new Error(
        "Unable to save market data"
      );

    }


    console.log(
      "Market data status:",
      getMarketStatus()
    );


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
  "Source: KOTAK NEO"
);

console.log(
  "API:",
  MARKET_API_URL
);

console.log(
  "Status:",
  MARKET_DATA.status
);

console.log(
  "--------------------------------"
);
