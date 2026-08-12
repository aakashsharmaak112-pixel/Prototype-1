// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES DEBUG
// api/quotes.js
// ============================================

export default async function handler(req, res) {

  // ------------------------------------------
  // ONLY GET
  // ------------------------------------------

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  // ------------------------------------------
  // ENVIRONMENT VARIABLES
  // ------------------------------------------

  const ACCESS_TOKEN =
    process.env.NEO_ACCESS_TOKEN;

  const BASE_URL =
    process.env.NEO_BASE_URL;

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN is not configured."
    });
  }

  if (!BASE_URL) {
    return res.status(500).json({
      success: false,
      error: "NEO_BASE_URL is not configured."
    });
  }

  // ------------------------------------------
  // NIFTY 50 STOCK SYMBOLS
  // ------------------------------------------

  const stocks = [
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
  // BUILD SYMBOL STRING
  // ------------------------------------------

  const symbolString =
    stocks.join(",");

  // ------------------------------------------
  // BUILD QUOTES URL
  // ------------------------------------------

  const quoteUrl =
    BASE_URL.replace(/\/+$/, "") +
    "/script-details/1.0/quotes/neosymbol/" +
    encodeURIComponent(symbolString) +
    "/all";

  // ------------------------------------------
  // HEADERS
  // ------------------------------------------

  const headers = {
    "Authorization": ACCESS_TOKEN,
    "Accept": "application/json"
  };

  try {

    // ----------------------------------------
    // REQUEST
    // ----------------------------------------

    const response =
      await fetch(
        quoteUrl,
        {
          method: "GET",
          headers: headers
        }
      );

    // ----------------------------------------
    // RAW RESPONSE
    // ----------------------------------------

    const rawText =
      await response.text();

    // ----------------------------------------
    // TRY JSON PARSE
    // ----------------------------------------

    let data = null;

    try {

      data =
        rawText
          ? JSON.parse(rawText)
          : null;

    } catch (error) {

      return res.status(502).json({

        success: false,

        source:
          "KOTAK NEO",

        message:
          "Kotak returned non-JSON response.",

        kotakHttpStatus:
          response.status,

        requestMethod:
          "GET",

        requestUrl:
          quoteUrl,

        rawResponse:
          rawText.substring(0, 5000)

      });

    }

    // ----------------------------------------
    // TEMPORARY DEBUG RESPONSE
    // ----------------------------------------
    //
    // IMPORTANT:
    // This is temporary.
    // We need to see EXACTLY what Kotak returns.
    //
    // ----------------------------------------

    return res.status(200).json({

      success:
        response.ok,

      source:
        "KOTAK NEO",

      debug:
        true,

      kotakHttpStatus:
        response.status,

      requestMethod:
        "GET",

      requestUrl:
        quoteUrl,

      responseType:
        Array.isArray(data)
          ? "ARRAY"
          : typeof data,

      rawKotakResponse:
        data

    });

  } catch (error) {

    console.error(
      "Kotak Neo Quotes Debug Error:",
      error
    );

    return res.status(500).json({

      success: false,

      source:
        "KOTAK NEO",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
