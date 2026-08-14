// ============================================
// PROTOTYPE-1
// KOTAK NEO QUOTES API
// LIVE MARKET DATA - READ ONLY
// Uses Scripmaster pSymbol as neoSymbol
// ============================================

const BASE_URL =
  process.env.NEO_BASE_URL ||
  "https://cis.kotaksecurities.com";

const ACCESS_TOKEN =
  process.env.NEO_ACCESS_TOKEN;


// ============================================
// NIFTY 50 SYMBOL NAMES
// ============================================

const NIFTY_SYMBOLS = [
  "HDFCBANK",
  "ICICIBANK",
  "RELIANCE",
  "BHARTIARTL",
  "LT",
  "SBIN",
  "INFY",
  "AXISBANK",
  "BAJFINANCE",
  "M&M",

  "ADANIENT",
  "ADANIPORTS",
  "APOLLOHOSP",
  "ASIANPAINT",
  "BAJAJ-AUTO",
  "BAJAJFINSV",
  "BEL",
  "CIPLA",
  "COALINDIA",
  "DRREDDY",
  "EICHERMOT",

  "ETERNAL",
  "GRASIM",
  "HCLTECH",
  "HDFCLIFE",
  "HINDALCO",
  "HINDUNILVR",
  "ITC",
  "INDIGO",
  "JSWSTEEL",
  "JIOFIN",

  "KOTAKBANK",
  "MARUTI",
  "MAXHEALTH",
  "NTPC",
  "NESTLEIND",
  "ONGC",
  "POWERGRID",
  "SHRIRAMFIN",
  "SUNPHARMA",
  "TATACONSUM",

  "TATASTEEL",
  "TCS",
  "TECHM",
  "TITAN",
  "TRENT",
  "ULTRACEMCO",
  "WIPRO",
  "HINDZINC",
  "TATAMOTORS"
];


// ============================================
// SCRIPMASTER
// ============================================

const MASTER_URL =
  "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-12/transformed-v1/nse_cm-v1.csv";


// ============================================
// RESPONSE HELPER
// ============================================

function sendJson(res, statusCode, body) {
  return res.status(statusCode).json(body);
}


// ============================================
// CSV PARSER
// ============================================

function parseCsvLine(line) {

  const values = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {

    const char = line[i];

    if (char === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());

  return values;
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
      error: "Only GET method is allowed."
    });

  }


  if (!ACCESS_TOKEN) {

    return sendJson(res, 500, {
      success: false,
      error: "NEO_ACCESS_TOKEN is not configured."
    });

  }


  try {

    // ========================================
    // 1. DOWNLOAD SCRIPMASTER
    // ========================================

    const masterResponse =
      await fetch(MASTER_URL, {
        method: "GET",
        headers: {
          "Accept": "text/csv"
        },
        cache: "no-store"
      });


    const csvText =
      await masterResponse.text();


    if (!masterResponse.ok) {

      return sendJson(res, masterResponse.status, {
        success: false,
        source: "KOTAK NEO",
        error: "Scripmaster download failed.",
        status: masterResponse.status,
        rawResponse: csvText.slice(0, 1000)
      });

    }


    // ========================================
    // 2. PARSE CSV
    // ========================================

    const lines =
      csvText
        .split(/\r?\n/)
        .filter(line => line.trim() !== "");


    if (lines.length < 2) {

      return sendJson(res, 502, {
        success: false,
        source: "KOTAK NEO",
        error: "Scripmaster CSV is empty."
      });

    }


    const header =
      parseCsvLine(lines[0]);


    const symbolIndex =
      header.indexOf("pSymbol");

    const tradingSymbolIndex =
      header.indexOf("pTrdSymbol");

    const exchangeIndex =
      header.indexOf("pExchSeg");

    const refKeyIndex =
      header.indexOf("pScripRefKey");

    const symbolNameIndex =
      header.indexOf("pSymbolName");


    if (
      symbolIndex < 0 ||
      tradingSymbolIndex < 0 ||
      exchangeIndex < 0
    ) {

      return sendJson(res, 502, {
        success: false,
        source: "KOTAK NEO",
        error: "Required Scripmaster fields missing.",
        availableHeaders: header
      });

    }


    // ========================================
    // 3. FIND EXACT NIFTY 50 -EQ SYMBOLS
    // ========================================

    const symbolMap = new Map();


    for (let i = 1; i < lines.length; i++) {

      const row =
        parseCsvLine(lines[i]);


      const exchange =
        row[exchangeIndex] || "";


      if (exchange !== "nse_cm") {
        continue;
      }


      const tradingSymbol =
        row[tradingSymbolIndex] || "";


      const symbol =
        row[symbolIndex] || "";


      const expectedName =
        tradingSymbol.toUpperCase();


      // ONLY normal equity instruments
      if (!expectedName.endsWith("-EQ")) {
        continue;
      }


      for (const niftySymbol of NIFTY_SYMBOLS) {

        if (
          expectedName ===
          niftySymbol.toUpperCase() + "-EQ"
        ) {

          if (!symbolMap.has(niftySymbol)) {

            symbolMap.set(niftySymbol, {
              name: niftySymbol,
              pSymbol: symbol,
              pTrdSymbol: tradingSymbol,
              pScripRefKey:
                refKeyIndex >= 0
                  ? row[refKeyIndex] || ""
                  : "",
              pSymbolName:
                symbolNameIndex >= 0
                  ? row[symbolNameIndex] || ""
                  : "",
              pExchSeg: exchange
            });

          }

        }

      }

    }


    // ========================================
    // 4. BUILD VALID NEO SYMBOL LIST
    // ========================================

    const instruments =
      NIFTY_SYMBOLS
        .map(name => symbolMap.get(name))
        .filter(Boolean);


    const missingSymbols =
      NIFTY_SYMBOLS.filter(
        name => !symbolMap.has(name)
      );


    if (!instruments.length) {

      return sendJson(res, 502, {
        success: false,
        source: "KOTAK NEO",
        error:
          "No valid NIFTY 50 EQ instruments found in Scripmaster.",
        missingSymbols
      });

    }


    // IMPORTANT:
    // Kotak Neo getQuote expects valid neoSymbol values.
    // Scripmaster pSymbol is used here.

    const neoSymbols =
      instruments
        .map(item => item.pSymbol)
        .join(",");


    const encodedNeoSymbols =
      encodeURIComponent(neoSymbols);


    // ========================================
    // 5. KOTAK NEO QUOTES API
    // ========================================

    const quotesUrl =
      BASE_URL.replace(/\/+$/, "") +
      "/script-details/1.0/quotes/neosymbol/" +
      encodedNeoSymbols +
      "/all";


    const response =
      await fetch(
        quotesUrl,
        {
          method: "GET",

          headers: {
            "Authorization": ACCESS_TOKEN,
            "Accept": "application/json",
            "Content-Type":
              "application/x-www-form-urlencoded"
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

    } catch {

      return sendJson(res, 502, {
        success: false,
        source: "KOTAK NEO",
        error:
          "Kotak Neo returned a non-JSON response.",
        status: response.status,
        rawResponse:
          rawText.slice(0, 2000)
      });

    }


    // ========================================
    // 6. KOTAK ERROR
    // ========================================

    if (!response.ok) {

      return sendJson(res, response.status, {
        success: false,
        source: "KOTAK NEO",
        error:
          "Kotak Neo Quotes API request failed.",
        status: response.status,
        kotakResponse: kotakData,
        requestedNeoSymbols: neoSymbols
      });

    }


    // ========================================
    // 7. EXTRACT QUOTES
    // ========================================

    const quotes =
      extractQuotes(kotakData);


    if (!quotes.length) {

      return sendJson(res, 502, {
        success: false,
        source: "KOTAK NEO",
        error:
          "Kotak Neo response received but no quotes found.",
        status: response.status,
        requestedNeoSymbols: neoSymbols,
        requestedCount: instruments.length,
        kotakResponse: kotakData
      });

    }


    // ========================================
    // 8. SUCCESS
    // ========================================

    return sendJson(res, 200, {

      success: true,

      source:
        "KOTAK NEO",

      marketData:
        "LIVE",

      totalRequested:
        NIFTY_SYMBOLS.length,

      validInstruments:
        instruments.length,

      totalReceived:
        quotes.length,

      totalErrors:
        Math.max(
          instruments.length -
          quotes.length,
          0
        ),

      missingSymbols,

      instruments,

      quotes

    });


  } catch (error) {

    console.error(
      "Kotak Neo quotes error:",
      error
    );


    return sendJson(res, 500, {

      success: false,

      source:
        "KOTAK NEO",

      error:
        error?.message ||
        "Unexpected server error."

    });

  }

}
