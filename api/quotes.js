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
// NIFTY 50 KOTAK SYMBOL IDs
// ============================================

const NEO_SYMBOLS = [
  "1333",
  "4963",
  "2885",
  "10604",
  "11483",
  "3045",
  "1594",
  "5900",
  "317",
  "2031",
  "25",
  "15083",
  "157",
  "236",
  "16669",
  "16675",
  "383",
  "694",
  "20374",
  "881",
  "910",
  "5097",
  "1232",
  "7229",
  "467",
  "1363",
  "1394",
  "1660",
  "11195",
  "11723",
  "18143",
  "1922",
  "10999",
  "22377",
  "11630",
  "17963",
  "2475",
  "14977",
  "4306",
  "3351",
  "3432",
  "3499",
  "11536",
  "13538",
  "3506",
  "1964",
  "11532",
  "3787",
  "1424"
];


// ============================================
// JSON HELPER
// ============================================

function sendJson(res, statusCode, body) {

  return res.status(statusCode).json(body);

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


  // ==========================================
  // KOTAK QUOTES URL
  // ==========================================

  const symbols =
    encodeURIComponent(
      NEO_SYMBOLS.join(",")
    );

  const quotesUrl =
    BASE_URL.replace(/\/+$/, "") +
    "/script-details/1.0/quotes/" +
    symbols +
    "/all";


  try {

    console.log(
      "Kotak Neo Quotes:",
      quotesUrl
    );


    const response =
      await fetch(
        quotesUrl,
        {
          method: "GET",

          headers: {

            "Authorization":
              ACCESS_TOKEN,

            "neo-fin-key":
              "neotradeapi",

            "Accept":
              "application/json"

          },

          cache:
            "no-store"

        }
      );


    const rawText =
      await response.text();


    // ========================================
    // PARSE RESPONSE
    // ========================================

    let kotakData;

    try {

      kotakData =
        JSON.parse(rawText);

    }

    catch {

      return sendJson(res, 502, {

        success: false,

        source:
          "KOTAK NEO",

        error:
          "Kotak Neo returned non-JSON response.",

        status:
          response.status,

        rawResponse:
          rawText.substring(0, 2000)

      });

    }


    // ========================================
    // KOTAK API ERROR
    // ========================================

    if (!response.ok) {

      return sendJson(res, response.status, {

        success: false,

        source:
          "KOTAK NEO",

        error:
          "Kotak Neo Quotes API request failed.",

        status:
          response.status,

        requestedNeoSymbols:
          NEO_SYMBOLS.join(","),

        kotakResponse:
          kotakData

      });

    }


    // ========================================
    // EXTRACT QUOTES
    // ========================================

    const quotes =
      extractQuotes(kotakData);


    // ========================================
    // NO QUOTES
    // ========================================

    if (!quotes.length) {

      return sendJson(res, 502, {

        success: false,

        source:
          "KOTAK NEO",

        error:
          "Kotak Neo response received but no quotes found.",

        status:
          response.status,

        requestedNeoSymbols:
          NEO_SYMBOLS.join(","),

        requestedCount:
          NEO_SYMBOLS.length,

        kotakResponse:
          kotakData

      });

    }


    // ========================================
    // SUCCESS
    // ========================================

    return sendJson(res, 200, {

      success:
        true,

      source:
        "KOTAK NEO",

      marketData:
        "LIVE",

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
      "Kotak Neo Quotes Error:",
      error
    );


    return sendJson(res, 500, {

      success:
        false,

      source:
        "KOTAK NEO",

      error:
        error?.message ||
        "Unknown server error."

    });

  }

}
