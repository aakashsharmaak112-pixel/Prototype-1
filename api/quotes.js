// ============================================
// PROTOTYPE-1
// KOTAK NEO QUOTES API
// LIVE MARKET DATA - READ ONLY
// ============================================

const BASE_URL =
  process.env.NEO_BASE_URL ||
  "https://cis.kotaksecurities.com";

const ACCESS_TOKEN =
  process.env.NEO_ACCESS_TOKEN;


// ============================================
// NIFTY 50 NEO SYMBOLS
// ============================================

const NEO_SYMBOLS = [
  "HDFCBANK-EQ",
  "ICICIBANK-EQ",
  "RELIANCE-EQ",
  "BHARTIARTL-EQ",
  "LT-EQ",
  "SBIN-EQ",
  "INFY-EQ",
  "AXISBANK-EQ",
  "BAJFINANCE-EQ",
  "M&M-EQ",

  "ADANIENT-EQ",
  "ADANIPORTS-EQ",
  "APOLLOHOSP-EQ",
  "ASIANPAINT-EQ",
  "BAJAJ-AUTO-EQ",
  "BAJAJFINSV-EQ",
  "BEL-EQ",
  "CIPLA-EQ",
  "COALINDIA-EQ",
  "DRREDDY-EQ",
  "EICHERMOT-EQ",

  "ETERNAL-EQ",
  "GRASIM-EQ",
  "HCLTECH-EQ",
  "HDFCLIFE-EQ",
  "HINDALCO-EQ",
  "HINDUNILVR-EQ",
  "ITC-EQ",
  "INDIGO-EQ",
  "JSWSTEEL-EQ",
  "JIOFIN-EQ",

  "KOTAKBANK-EQ",
  "MARUTI-EQ",
  "MAXHEALTH-EQ",
  "NTPC-EQ",
  "NESTLEIND-EQ",
  "ONGC-EQ",
  "POWERGRID-EQ",
  "SHRIRAMFIN-EQ",
  "SUNPHARMA-EQ",
  "TATACONSUM-EQ",

  "TATASTEEL-EQ",
  "TCS-EQ",
  "TECHM-EQ",
  "TITAN-EQ",
  "TRENT-EQ",
  "ULTRACEMCO-EQ",
  "WIPRO-EQ",
  "HINDZINC-EQ",
  "TATAMOTORS-EQ"
];


// ============================================
// RESPONSE HELPER
// ============================================

function sendJson(res, statusCode, body) {
  res.status(statusCode).json(body);
}


// ============================================
// EXTRACT QUOTES
// ============================================

function extractQuotes(data) {

  if (Array.isArray(data)) {
    return data;
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  if (Array.isArray(data.data)) {
    return data.data;
  }

  if (Array.isArray(data.quotes)) {
    return data.quotes;
  }

  if (Array.isArray(data.result)) {
    return data.result;
  }

  if (Array.isArray(data.results)) {
    return data.results;
  }

  return [];
}


// ============================================
// API HANDLER
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {

    return sendJson(res, 405, {
      success: false,
      error: "Method not allowed"
    });

  }


  if (!ACCESS_TOKEN) {

    return sendJson(res, 500, {
      success: false,
      error: "NEO_ACCESS_TOKEN is not configured"
    });

  }


  const neoSymbols =
    encodeURIComponent(
      NEO_SYMBOLS.join(",")
    );

  const quotesUrl =
    BASE_URL.replace(/\/+$/, "") +
    "/script-details/1.0/quotes/neosymbol/" +
    neoSymbols +
    "/all";


  try {

    console.log(
      "Kotak Neo quotes request started:",
      NEO_SYMBOLS.length,
      "symbols"
    );


    const response =
      await fetch(
        quotesUrl,
        {
          method: "GET",

          headers: {
            "Authorization": ACCESS_TOKEN,
            "Accept": "application/json",
            "Content-Type":
              "application/x-www-form-urlencoded",
            "neo-fin-key":
              "neotradeapi"
          },

          cache: "no-store"
        }
      );


    const rawText =
      await response.text();


    let kotakData;

    try {

      kotakData =
        JSON.parse(rawText);

    }

    catch {

      return sendJson(res, 502, {
        success: false,
        source: "KOTAK NEO",
        error:
          "Kotak Neo returned a non-JSON response.",
        status:
          response.status,
        rawResponse:
          rawText.slice(0, 1000)
      });

    }


    if (!response.ok) {

      return sendJson(res, response.status, {
        success: false,
        source: "KOTAK NEO",
        error:
          "Kotak Neo Quotes API request failed.",
        status:
          response.status,
        kotakResponse:
          kotakData
      });

    }


    const quotes =
      extractQuotes(kotakData);


    if (!quotes.length) {

      return sendJson(res, 502, {
        success: false,
        source: "KOTAK NEO",
        error:
          "Kotak Neo response received but no quotes found.",
        status:
          response.status,
        kotakResponse:
          kotakData
      });

    }


    console.log(
      "Kotak Neo quotes received:",
      quotes.length
    );


    return sendJson(res, 200, {

      success: true,

      source:
        "KOTAK NEO",

      totalRequested:
        NEO_SYMBOLS.length,

      totalReceived:
        quotes.length,

      totalErrors:
        Math.max(
          NEO_SYMBOLS.length -
          quotes.length,
          0
        ),

      quotes:
        quotes

    });

  }

  catch (error) {

    console.error(
      "Kotak Neo quotes error:",
      error
    );


    return sendJson(res, 500, {

      success: false,

      source:
        "KOTAK NEO",

      error:
        error &&
        error.message
          ? error.message
          : "Unknown server error"

    });

  }

}
