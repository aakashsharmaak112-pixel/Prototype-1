// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES API
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
  // NIFTY 50 STOCKS
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
  // CREATE NEO SYMBOL STRING
  // ------------------------------------------

  const neoSymbols =
    stocks.join(",");

  // ------------------------------------------
  // URL ENCODE SYMBOLS
  // ------------------------------------------

  const encodedSymbols =
    encodeURIComponent(neoSymbols);

  // ------------------------------------------
  // KOTAK NEO QUOTES URL
  // ------------------------------------------

  const quoteUrl =
    BASE_URL.replace(/\/+$/, "") +
    "/script-details/1.0/quotes/neosymbol/" +
    encodedSymbols +
    "/all";

  console.log(
    "Kotak Neo Quotes URL:",
    quoteUrl
  );

  // ------------------------------------------
  // HEADERS
  // ------------------------------------------

  const headers = {
    "Authorization": ACCESS_TOKEN,
    "Content-Type": "application/x-www-form-urlencoded",
    "Accept": "application/json"
  };

  try {

    // ----------------------------------------
    // KOTAK NEO REQUEST
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
    // READ RAW RESPONSE
    // ----------------------------------------

    const rawText =
      await response.text();

    console.log(
      "Kotak Neo Quotes HTTP status:",
      response.status
    );

    // ----------------------------------------
    // PARSE JSON
    // ----------------------------------------

    let data = null;

    try {

      data =
        rawText
          ? JSON.parse(rawText)
          : null;

    } catch (parseError) {

      return res.status(502).json({
        success: false,
        source: "KOTAK NEO",
        error:
          "Kotak Neo returned a non-JSON response.",
        status:
          response.status,
        rawResponse:
          rawText.substring(0, 1000)
      });

    }

    // ----------------------------------------
    // KOTAK API ERROR
    // ----------------------------------------

    if (!response.ok) {

      return res.status(response.status).json({
        success: false,
        source: "KOTAK NEO",
        error:
          "Kotak Neo Quotes API request failed.",
        status:
          response.status,
        kotakResponse:
          data
      });

    }

    // ----------------------------------------
    // EXTRACT QUOTES
    // ----------------------------------------

    let quotes = [];

    if (Array.isArray(data)) {

      quotes = data;

    } else if (
      data &&
      Array.isArray(data.data)
    ) {

      quotes = data.data;

    } else if (
      data &&
      Array.isArray(data.quotes)
    ) {

      quotes = data.quotes;

    } else if (
      data &&
      Array.isArray(data.result)
    ) {

      quotes = data.result;

    } else if (
      data &&
      Array.isArray(data.results)
    ) {

      quotes = data.results;

    } else if (
      data &&
      typeof data.data === "object" &&
      data.data !== null
    ) {

      quotes =
        Object.values(data.data);

    }

    // ----------------------------------------
    // NORMALIZE QUOTES
    // ----------------------------------------

    const normalizedQuotes = [];

    quotes.forEach(function(quote) {

      if (
        !quote ||
        typeof quote !== "object"
      ) {
        return;
      }

      const symbol =
        quote.symbol ||
        quote.neo_symbol ||
        quote.neoSymbol ||
        quote.display_symbol ||
        quote.displaySymbol ||
        "";

      const displaySymbol =
        quote.display_symbol ||
        quote.displaySymbol ||
        (
          symbol
            ? symbol + "-EQ"
            : ""
        );

      const ltp =
        quote.ltp ??
        quote.LTP ??
        quote.last_traded_price ??
        quote.lastTradedPrice ??
        quote.last_price ??
        quote.lastPrice ??
        null;

      const previousClose =
        quote.previous_close ??
        quote.previousClose ??
        quote.prev_close ??
        quote.prevClose ??
        quote.close_price ??
        quote.close ??
        null;

      let netChange =
        quote.net_change ??
        quote.netChange ??
        quote.change ??
        quote.chg ??
        null;

      let percentageChange =
        quote.percentage_change ??
        quote.percentageChange ??
        quote.percent_change ??
        quote.percentChange ??
        quote.pChange ??
        null;

      const priceNumber =
        Number(ltp);

      const previousNumber =
        Number(previousClose);

      // --------------------------------------
      // CALCULATE CHANGE IF POSSIBLE
      // --------------------------------------

      if (
        Number.isFinite(priceNumber) &&
        Number.isFinite(previousNumber) &&
        previousNumber > 0
      ) {

        netChange =
          priceNumber -
          previousNumber;

        percentageChange =
          (
            netChange /
            previousNumber
          ) * 100;

      }

      normalizedQuotes.push({

        display_symbol:
          displaySymbol,

        symbol:
          symbol,

        exchange:
          quote.exchange ||
          quote.exchange_segment ||
          "nse_cm",

        instrument_token:
          String(
            quote.instrument_token ??
            quote.instrumentToken ??
            quote.token ??
            ""
          ),

        ltp:
          Number.isFinite(priceNumber)
            ? priceNumber
            : null,

        previous_close:
          Number.isFinite(previousNumber)
            ? previousNumber
            : null,

        percentage_change:
          Number.isFinite(
            Number(percentageChange)
          )
            ? Number(
                Number(
                  percentageChange
                ).toFixed(2)
              )
            : null,

        net_change:
          Number.isFinite(
            Number(netChange)
          )
            ? Number(
                Number(
                  netChange
                ).toFixed(2)
              )
            : null

      });

    });

    // ----------------------------------------
    // REMOVE DUPLICATES
    // ----------------------------------------

    const uniqueQuotes =
      Array.from(
        new Map(
          normalizedQuotes.map(
            function(item) {

              return [
                item.symbol ||
                item.display_symbol,
                item
              ];

            }
          )
        ).values()
      );

    // ----------------------------------------
    // RESPONSE
    // ----------------------------------------

    return res.status(200).json({

      success: true,

      source:
        "KOTAK NEO",

      marketData:
        "LIVE",

      endpoint:
        "/script-details/1.0/quotes/neosymbol/{symbols}/all",

      totalRequested:
        stocks.length,

      totalReceived:
        uniqueQuotes.length,

      totalErrors:
        Math.max(
          0,
          stocks.length -
          uniqueQuotes.length
        ),

      quotes:
        uniqueQuotes,

      errors: []

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
