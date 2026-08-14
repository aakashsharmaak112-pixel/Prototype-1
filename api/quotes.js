// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES
// api/quotes.js
// ============================================

export default async function handler(req, res) {

  // ------------------------------------------
  // METHOD
  // ------------------------------------------

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      source: "KOTAK NEO",
      error: "Use POST method."
    });
  }

  // ------------------------------------------
  // ENVIRONMENT
  // ------------------------------------------

  const ACCESS_TOKEN =
    process.env.NEO_ACCESS_TOKEN;

  const BASE_URL =
    String(
      process.env.NEO_BASE_URL || ""
    ).trim().replace(/\/+$/, "");

  // ------------------------------------------
  // LOGIN SESSION
  // ------------------------------------------

  const SID =
    String(
      req.body?.sid ||
      req.body?.Sid ||
      ""
    ).trim();

  const AUTH =
    String(
      req.body?.auth ||
      req.body?.token ||
      req.body?.Auth ||
      ""
    ).trim();

  // ------------------------------------------
  // SYMBOLS
  // ------------------------------------------

  const requestedSymbols =
    Array.isArray(req.body?.symbols)
      ? req.body.symbols
      : [];

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      source: "KOTAK NEO",
      error: "NEO_ACCESS_TOKEN missing."
    });
  }

  if (!BASE_URL) {
    return res.status(500).json({
      success: false,
      source: "KOTAK NEO",
      error: "NEO_BASE_URL missing."
    });
  }

  if (!SID) {
    return res.status(400).json({
      success: false,
      source: "KOTAK NEO",
      error: "Sid/session id missing."
    });
  }

  if (!AUTH) {
    return res.status(400).json({
      success: false,
      source: "KOTAK NEO",
      error: "Auth/session token missing."
    });
  }

  // ------------------------------------------
  // CLEAN SYMBOLS
  // ------------------------------------------

  const symbols =
    requestedSymbols
      .map(function(item) {

        if (
          typeof item === "string"
        ) {
          return {
            symbol: item,
            neoSymbol: item
          };
        }

        return item || null;

      })
      .filter(Boolean);

  if (!symbols.length) {
    return res.status(400).json({
      success: false,
      source: "KOTAK NEO",
      error: "No valid symbols supplied."
    });
  }

  // ------------------------------------------
  // BUILD NEO SYMBOL LIST
  // ------------------------------------------

  const neoSymbols =
    symbols
      .map(function(item) {

        return String(
          item.neoSymbol ||
          item.pSymbol ||
          item.pScripRefKey ||
          ""
        ).trim();

      })
      .filter(function(value) {

        return value.length > 0;

      });

  if (!neoSymbols.length) {
    return res.status(400).json({
      success: false,
      source: "KOTAK NEO",
      error: "No valid neosymbol values found."
    });
  }

  // ------------------------------------------
  // UNIQUE SYMBOLS
  // ------------------------------------------

  const uniqueNeoSymbols =
    [...new Set(neoSymbols)];

  // ------------------------------------------
  // POSSIBLE KOTAK QUOTE ENDPOINT
  // ------------------------------------------

  const quoteUrl =
    BASE_URL +
    "/script-details/1.0/quotes/neosymbol";

  // ------------------------------------------
  // REQUEST BODY
  // ------------------------------------------

  const requestBody = {
    data: {
      neosymbol:
        uniqueNeoSymbols
    }
  };

  console.log(
    "========================================"
  );

  console.log(
    "PROTOTYPE-1 KOTAK NEO QUOTES"
  );

  console.log(
    "BASE URL:",
    BASE_URL
  );

  console.log(
    "QUOTE URL:",
    quoteUrl
  );

  console.log(
    "REQUESTED SYMBOL COUNT:",
    uniqueNeoSymbols.length
  );

  console.log(
    "REQUEST BODY:",
    JSON.stringify(requestBody)
  );

  console.log(
    "========================================"
  );

  // ------------------------------------------
  // KOTAK REQUEST
  // ------------------------------------------

  try {

    const response =
      await fetch(
        quoteUrl,
        {
          method: "POST",

          headers: {
            "Authorization":
              AUTH,

            "Sid":
              SID,

            "neo-fin-key":
              "neotradeapi",

            "Content-Type":
              "application/json",

            "Accept":
              "application/json"
          },

          body:
            JSON.stringify(
              requestBody
            )
        }
      );

    const rawResponse =
      await response.text();

    console.log(
      "KOTAK HTTP STATUS:",
      response.status
    );

    console.log(
      "KOTAK RAW RESPONSE:",
      rawResponse
    );

    // ----------------------------------------
    // JSON PARSE
    // ----------------------------------------

    let data = null;

    try {

      data =
        rawResponse
          ? JSON.parse(
              rawResponse
            )
          : null;

    } catch (parseError) {

      return res.status(
        response.ok
          ? 502
          : response.status
      ).json({

        success: false,

        source:
          "KOTAK NEO",

        step:
          "QUOTES",

        kotakHttpStatus:
          response.status,

        endpoint:
          quoteUrl,

        requestedCount:
          uniqueNeoSymbols.length,

        error:
          "Kotak Neo returned non-JSON response.",

        rawResponse:
          rawResponse
      });

    }

    // ----------------------------------------
    // HTTP ERROR
    // ----------------------------------------

    if (!response.ok) {

      return res.status(
        response.status
      ).json({

        success: false,

        source:
          "KOTAK NEO",

        step:
          "QUOTES",

        kotakHttpStatus:
          response.status,

        endpoint:
          quoteUrl,

        requestedCount:
          uniqueNeoSymbols.length,

        error:
          "Kotak Neo quotes request failed.",

        kotakResponse:
          data
      });

    }

    // ----------------------------------------
    // SUCCESS
    // ----------------------------------------

    return res.status(200).json({

      success:
        true,

      source:
        "KOTAK NEO",

      step:
        "QUOTES",

      kotakHttpStatus:
        response.status,

      endpoint:
        quoteUrl,

      requestedCount:
        uniqueNeoSymbols.length,

      kotakResponse:
        data

    });

  } catch (error) {

    console.error(
      "KOTAK QUOTES ERROR:",
      error
    );

    return res.status(500).json({

      success:
        false,

      source:
        "KOTAK NEO",

      step:
        "QUOTES",

      requestedCount:
        uniqueNeoSymbols.length,

      error:
        error.message ||
        "Unexpected quotes request error."

    });

  }

}
