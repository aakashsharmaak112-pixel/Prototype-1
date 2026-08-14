// ============================================
// PROTOTYPE-1
// MARKET DATA ENGINE
// LIVE KOTAK NEO MARKET DATA
// POST + FRESH TOTP
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

  // ------------------------------------------
  // NEW /api/quotes RESPONSE STRUCTURE
  // ------------------------------------------

  let raw = quote;

  if (
    quote.data &&
    typeof quote.data === "object"
  ) {

    raw = quote.data;

  }

  if (
    raw.data &&
    typeof raw.data === "object"
  ) {

    raw = raw.data;

  }

  // ------------------------------------------
  // SYMBOL
  // ------------------------------------------

  const symbol =
    normalizeSymbol(

      quote.symbol ||

      quote.display_symbol ||

      quote.trading_symbol ||

      quote.pTrdSymbol ||

      quote.neoSymbol ||

      quote.neo_symbol ||

      raw.display_symbol ||

      raw.symbol ||

      raw.trading_symbol ||

      raw.pTrdSymbol ||

      raw.neoSymbol ||

      raw.neo_symbol

    );


  if (!symbol) {
    return null;
  }


  // ------------------------------------------
  // PRICE
  // ------------------------------------------

  const price =
    toNumber(

      raw.ltp ??

      raw.last_price ??

      raw.lastPrice ??

      raw.close_price ??

      raw.close ??

      raw.LTP ??

      raw.lp

    );


  if (price <= 0) {
    return null;
  }


  // ------------------------------------------
  // PREVIOUS CLOSE
  // ------------------------------------------

  const previousClose =
    toNumber(

      raw.previous_close ??

      raw.prev_close ??

      raw.prevClose ??

      raw.previousClose ??

      raw.pc ??

      raw.PREVIOUS_CLOSE

    );


  // ------------------------------------------
  // PERCENT CHANGE
  // ------------------------------------------

  let percentChange =
    toNumber(

      raw.percentage_change ??

      raw.percent_change ??

      raw.percentChange ??

      raw.change_percent ??

      raw.changePercent ??

      raw.pChange ??

      raw.PERCENTAGE_CHANGE

    );


  if (
    previousClose > 0 &&
    price > 0
  ) {

    percentChange =
      (
        (price - previousClose) /
        previousClose
      ) * 100;

  }


  // ------------------------------------------
  // RUPEE CHANGE
  // ------------------------------------------

  let rupeeChange =
    toNumber(

      raw.net_change ??

      raw.netChange ??

      raw.change ??

      raw.chg ??

      raw.NET_CHANGE

    );


  if (
    previousClose > 0 &&
    price > 0
  ) {

    rupeeChange =
      price - previousClose;

  }


  // ------------------------------------------
  // FINAL NORMALIZED STOCK
  // ------------------------------------------

  return {

    symbol:
      symbol,

    price:
      Number(
        price.toFixed(2)
      ),

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
// SAVE MARKET DATA
// ============================================

function saveMarketData(data) {

  if (!data) {

    console.error(
      "Invalid market data response."
    );

    MARKET_DATA.status =
      "ERROR";

    return false;

  }


  const quotes =
    extractQuotes(data);


  if (!quotes.length) {

    console.error(
      "No quotes array found in API response.",
      data
    );

    MARKET_DATA.status =
      "ERROR";

    return false;

  }


  const normalized = {};


  quotes.forEach(
    function(quote) {

      const result =
        normalizeNeoQuote(
          quote
        );


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


  const stockCount =
    Object.keys(
      normalized
    ).length;


  if (
    stockCount === 0
  ) {

    console.error(
      "Quotes received but no valid stock prices found.",
      quotes
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
    normalizeSymbol(
      symbol
    );


  return (
    MARKET_DATA.stocks[key] ||
    null
  );

}


// ============================================
// GET ALL MARKET DATA
// ============================================

function getAllMarketData() {

  return (
    MARKET_DATA.stocks
  );

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
// API ERROR MESSAGE
// ============================================

function getApiErrorMessage(data) {

  if (!data) {
    return "Empty API response.";
  }


  if (data.error) {
    return String(
      data.error
    );
  }


  if (data.kotakResponse) {

    const response =
      data.kotakResponse;

    return (
      response?.fault?.description ||

      response?.fault?.message ||

      response?.message ||

      "Kotak API request failed."
    );

  }


  if (
    Array.isArray(
      data.errors
    ) &&
    data.errors.length > 0
  ) {

    const firstError =
      data.errors[0];

    return (

      firstError?.response?.fault?.description ||

      firstError?.response?.fault?.message ||

      firstError?.error ||

      "Live quote request failed."

    );

  }


  return (
    "Live market data request failed."
  );

}


// ============================================
// FETCH LIVE MARKET DATA
//
// IMPORTANT:
// /api/quotes is POST-only.
// It requires the current 6-digit TOTP.
//
// Usage:
// fetchMarketData("123456")
// ============================================

async function fetchMarketData(
  totp
) {

  try {

    const cleanTotp =
      String(
        totp || ""
      ).trim();


    // ----------------------------------------
    // TOTP VALIDATION
    // ----------------------------------------

    if (
      !/^\d{6}$/.test(
        cleanTotp
      )
    ) {

      MARKET_DATA.status =
        "TOTP_REQUIRED";


      console.error(
        "Current 6-digit TOTP required."
      );


      return false;

    }


    MARKET_DATA.status =
      "LOADING";


    // ----------------------------------------
    // POST REQUEST
    // ----------------------------------------

    const response =
      await fetch(

        MARKET_API_URL,

        {

          method:
            "POST",

          cache:
            "no-store",

          headers: {

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"

          },

          body:
            JSON.stringify({

              totp:
                cleanTotp

            })

        }

      );


    // ----------------------------------------
    // READ RESPONSE
    // ----------------------------------------

    const responseText =
      await response.text();


    let data;


    try {

      data =
        responseText
          ? JSON.parse(
              responseText
            )
          : null;

    } catch {

      throw new Error(
        "Quotes API returned non-JSON response."
      );

    }


    console.log(
      "Quotes API response:",
      data
    );


    // ----------------------------------------
    // HTTP ERROR
    // ----------------------------------------

    if (
      !response.ok
    ) {

      throw new Error(

        getApiErrorMessage(
          data
        )

      );

    }


    // ----------------------------------------
    // API ERROR
    // ----------------------------------------

    if (
      data &&
      data.success === false
    ) {

      throw new Error(

        getApiErrorMessage(
          data
        )

      );

    }


    // ----------------------------------------
    // SAVE DATA
    // ----------------------------------------

    const success =
      saveMarketData(
        data
      );


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
  "Method: POST + FRESH TOTP"
);

console.log(
  "Status:",
  MARKET_DATA.status
);

console.log(
  "================================"
);
