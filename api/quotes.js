// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES - VERIFIED 4 STOCK TEST
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
  // VERIFIED KOTAK NEO SYMBOLS
  // FROM SCRIP MASTER
  // ------------------------------------------

  const stocks = [
    {
      symbol: "HDFCBANK",
      neosymbol: "HDFCBANK"
    },
    {
      symbol: "TCS",
      neosymbol: "TCS"
    },
    {
      symbol: "RELIANCE",
      neosymbol: "RELIANCE"
    },
    {
      symbol: "INFY",
      neosymbol: "INFY"
    }
  ];

  // ------------------------------------------
  // BUILD SYMBOL STRING
  // ------------------------------------------

  const symbolString =
    stocks
      .map(function(stock) {
        return stock.neosymbol;
      })
      .join(",");

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
    // JSON PARSE
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

        error:
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
    // DEBUG RESPONSE
    // ----------------------------------------

    return res.status(200).json({

      success:
        response.ok,

      source:
        "KOTAK NEO",

      marketData:
        "LIVE",

      debug:
        true,

      kotakHttpStatus:
        response.status,

      requestMethod:
        "GET",

      requestedStocks:
        stocks,

      symbolString:
        symbolString,

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
      "Kotak Neo Quotes Error:",
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
