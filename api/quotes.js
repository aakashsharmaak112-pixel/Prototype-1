// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES - TOKEN TEST
// api/quotes.js
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
  // VERIFIED SCRIP MASTER IDs
  // ------------------------------------------

  const stocks = [
    {
      symbol: "HDFCBANK",
      token: "1333"
    },
    {
      symbol: "TCS",
      token: "11536"
    },
    {
      symbol: "RELIANCE",
      token: "2885"
    },
    {
      symbol: "INFY",
      token: "1594"
    }
  ];

  // ------------------------------------------
  // INSTRUMENT TOKENS
  // ------------------------------------------

  const instrumentTokens =
    stocks.map(function(stock) {
      return {
        instrument_token: stock.token,
        exchange_segment: "nse_cm"
      };
    });

  // ------------------------------------------
  // QUOTES ENDPOINT
  // ------------------------------------------

  const quoteUrl =
    BASE_URL.replace(/\/+$/, "") +
    "/script-details/1.0/quotes/";

  // ------------------------------------------
  // HEADERS
  // ------------------------------------------

  const headers = {
    "Authorization": ACCESS_TOKEN,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  try {

    // ----------------------------------------
    // KOTAK REQUEST
    // ----------------------------------------

    const response =
      await fetch(
        quoteUrl,
        {
          method: "POST",

          headers: headers,

          body: JSON.stringify({
            instrument_tokens:
              instrumentTokens,

            quote_type:
              "all"
          })
        }
      );

    // ----------------------------------------
    // RAW RESPONSE
    // ----------------------------------------

    const rawText =
      await response.text();

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
          "POST",

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
        "POST",

      requestedStocks:
        stocks,

      instrumentTokens:
        instrumentTokens,

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
