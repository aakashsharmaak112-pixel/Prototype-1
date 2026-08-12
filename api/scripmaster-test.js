// ============================================
// PROTOTYPE-1
// KOTAK NEO SCRIP MASTER NSE CM TEST
// api/scripmaster-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const ACCESS_TOKEN =
    process.env.NEO_ACCESS_TOKEN;

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN is not configured."
    });
  }

  const masterUrl =
    "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-12/transformed-v1/nse_cm-v1.csv";

  try {

    const response = await fetch(masterUrl, {
      method: "GET",
      headers: {
        "Authorization": ACCESS_TOKEN,
        "Accept": "text/csv"
      }
    });

    const csvText =
      await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        source: "KOTAK NEO",
        error: "Scrip Master download failed.",
        status: response.status,
        rawResponse: csvText.substring(0, 2000)
      });
    }

    // ------------------------------------------
    // FIND HEADER
    // ------------------------------------------

    const lines =
      csvText
        .split(/\r?\n/)
        .filter(function(line) {
          return line.trim() !== "";
        });

    if (lines.length === 0) {
      return res.status(502).json({
        success: false,
        error: "Scrip Master CSV is empty."
      });
    }

    const header =
      lines[0]
        .split(",")
        .map(function(value) {
          return value
            .replace(/^"|"$/g, "")
            .trim();
        });

    // ------------------------------------------
    // NIFTY STOCKS TO SEARCH
    // ------------------------------------------

    const searchSymbols = [
      "MARUTI",
      "ULTRACEMCO",
      "TCS",
      "GRASIM",
      "JSWSTEEL",
      "LT",
      "BHARTIARTL",
      "HEROMOTOCO",
      "NTPC",
      "HINDALCO",
      "HINDUNILVR",
      "HDFCBANK",
      "TECHM",
      "BAJAJFINSV",
      "TITAN",
      "RELIANCE",
      "SBIN",
      "ONGC",
      "MAXHEALTH",
      "TRENT",
      "COALINDIA",
      "NESTLEIND",
      "APOLLOHOSP",
      "ADANIPORTS",
      "POWERGRID",
      "ASIANPAINT",
      "INFY",
      "M&M",
      "KOTAKBANK",
      "ADANIENT",
      "ITC",
      "TATACONSUM",
      "BAJAJ-AUTO",
      "SBILIFE",
      "SUNPHARMA",
      "TATASTEEL",
      "BAJFINANCE",
      "SHRIRAMFIN",
      "BEL",
      "ICICIBANK",
      "HDFCLIFE",
      "WIPRO",
      "INDUSINDBK",
      "ETERNAL",
      "AXISBANK",
      "HCLTECH",
      "JINDALSTEL",
      "CIPLA",
      "EICHERMOT",
      "DRREDDY"
    ];

    // ------------------------------------------
    // SIMPLE CSV PARSER
    // ------------------------------------------

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

    // ------------------------------------------
    // COLUMN INDEXES
    // ------------------------------------------

    const symbolIndex =
      header.indexOf("pSymbol");

    const exchangeIndex =
      header.indexOf("pExchSeg");

    const tradingSymbolIndex =
      header.indexOf("pTrdSymbol");

    const instrumentTokenIndex =
      header.indexOf("pToken");

    // ------------------------------------------
    // PARSE MATCHING STOCKS
    // ------------------------------------------

    const results = [];

    for (let i = 1; i < lines.length; i++) {

      const row =
        parseCsvLine(lines[i]);

      const symbol =
        symbolIndex >= 0
          ? row[symbolIndex]
          : "";

      const exchange =
        exchangeIndex >= 0
          ? row[exchangeIndex]
          : "";

      const tradingSymbol =
        tradingSymbolIndex >= 0
          ? row[tradingSymbolIndex]
          : "";

      const instrumentToken =
        instrumentTokenIndex >= 0
          ? row[instrumentTokenIndex]
          : "";

      if (
        exchange === "nse_cm" &&
        searchSymbols.includes(symbol)
      ) {

        results.push({
          pSymbol: symbol,
          pExchSeg: exchange,
          pTrdSymbol: tradingSymbol,
          pToken: instrumentToken
        });

      }

    }

    // ------------------------------------------
    // RESPONSE
    // ------------------------------------------

    return res.status(200).json({

      success: true,

      source: "KOTAK NEO",

      marketData: "SCRIPMASTER",

      file:
        "nse_cm-v1.csv",

      totalStocksRequested:
        searchSymbols.length,

      totalMatches:
        results.length,

      missing:
        searchSymbols.filter(function(symbol) {

          return !results.some(function(item) {
            return item.pSymbol === symbol;
          });

        }),

      stocks:
        results

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      source: "KOTAK NEO",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
