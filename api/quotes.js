// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE NIFTY 50 QUOTES
// api/quotes.js
// ============================================

const ACCESS_TOKEN = String(
  process.env.NEO_ACCESS_TOKEN || ""
).trim();

const BASE_URL = String(
  process.env.NEO_BASE_URL ||
  "https://cis.kotaksecurities.com"
).trim().replace(/\/+$/, "");

// ============================================
// NIFTY 50 — CONFIRMED EXCHANGE TOKENS
// ============================================
// HDFCBANK = 1333 was directly confirmed working.
// Other tokens will be supplied through this map
// and failed tokens will be reported, not hidden.

const STOCKS = [
  { symbol: "ADANIENT", token: "25" },
  { symbol: "ADANIPORTS", token: "15083" },
  { symbol: "APOLLOHOSP", token: "157" },
  { symbol: "ASIANPAINT", token: "236" },
  { symbol: "AXISBANK", token: "5900" },
  { symbol: "BAJAJ-AUTO", token: "16669" },
  { symbol: "BAJFINANCE", token: "317" },
  { symbol: "BAJAJFINSV", token: "16675" },
  { symbol: "BEL", token: "383" },
  { symbol: "BHARTIARTL", token: "10604" },
  { symbol: "CIPLA", token: "694" },
  { symbol: "COALINDIA", token: "20374" },
  { symbol: "DRREDDY", token: "881" },
  { symbol: "EICHERMOT", token: "910" },
  { symbol: "ETERNAL", token: "5097" },
  { symbol: "GRASIM", token: "1232" },
  { symbol: "HCLTECH", token: "7229" },
  { symbol: "HDFCBANK", token: "1333" },
  { symbol: "HDFCLIFE", token: "467" },
  { symbol: "HEROMOTOCO", token: "1348" },
  { symbol: "HINDALCO", token: "1363" },
  { symbol: "HINDUNILVR", token: "1394" },
  { symbol: "ICICIBANK", token: "4963" },
  { symbol: "INDUSINDBK", token: "5258" },
  { symbol: "INFY", token: "1594" },
  { symbol: "ITC", token: "1660" },
  { symbol: "JIOFIN", token: "18143" },
  { symbol: "JSWSTEEL", token: "11723" },
  { symbol: "KOTAKBANK", token: "1922" },
  { symbol: "LT", token: "11483" },
  { symbol: "M&M", token: "2031" },
  { symbol: "MARUTI", token: "10999" },
  { symbol: "NESTLEIND", token: "17963" },
  { symbol: "NTPC", token: "11630" },
  { symbol: "ONGC", token: "2475" },
  { symbol: "POWERGRID", token: "14977" },
  { symbol: "RELIANCE", token: "2885" },
  { symbol: "SBILIFE", token: "21808" },
  { symbol: "SBIN", token: "3045" },
  { symbol: "SHRIRAMFIN", token: "4306" },
  { symbol: "SUNPHARMA", token: "3351" },
  { symbol: "TATACONSUM", token: "3432" },
  { symbol: "TATAMOTORS", token: "3456" },
  { symbol: "TATASTEEL", token: "3499" },
  { symbol: "TCS", token: "11536" },
  { symbol: "TECHM", token: "13538" },
  { symbol: "TITAN", token: "3506" },
  { symbol: "TRENT", token: "1964" },
  { symbol: "ULTRACEMCO", token: "11532" },
  { symbol: "WIPRO", token: "3787" }
];

// ============================================
// SINGLE QUOTE
// ============================================

async function getQuote(stock) {
  const neoSymbol =
    "nse_cm|" + stock.token;

  const url =
    BASE_URL +
    "/script-details/1.0/quotes/neosymbol/" +
    encodeURIComponent(neoSymbol) +
    "/all";

  const started =
    Date.now();

  try {
    const response =
      await fetch(url, {
        method: "GET",

        headers: {
          Authorization:
            ACCESS_TOKEN,

          "Content-Type":
            "application/x-www-form-urlencoded",

          Accept:
            "application/json"
        },

        cache:
          "no-store"
      });

    const text =
      await response.text();

    let data = null;

    try {
      data =
        text
          ? JSON.parse(text)
          : null;
    } catch {}

    const first =
      Array.isArray(data)
        ? data[0]
        : null;

    if (
      response.ok &&
      first
    ) {
      return {
        success: true,

        symbol:
          stock.symbol,

        token:
          stock.token,

        exchange:
          first.exchange ||
          "nse_cm",

        displaySymbol:
          first.display_symbol ||
          stock.symbol,

        ltp:
          first.ltp ?? null,

        change:
          first.change ?? null,

        perChange:
          first.per_change ?? null,

        open:
          first.ohlc?.open ??
          null,

        high:
          first.ohlc?.high ??
          null,

        low:
          first.ohlc?.low ??
          null,

        close:
          first.ohlc?.close ??
          null,

        lastTradedQuantity:
          first.last_traded_quantity ??
          null,

        avgCost:
          first.avg_cost ??
          null,

        yearHigh:
          first.year_high ??
          null,

        yearLow:
          first.year_low ??
          null,

        lastUpdated:
          first.lstup_time ??
          null,

        responseTimeMs:
          Date.now() -
          started
      };
    }

    return {
      success: false,

      symbol:
        stock.symbol,

      token:
        stock.token,

      httpStatus:
        response.status,

      error:
        data ||
        text.slice(0, 500),

      responseTimeMs:
        Date.now() -
        started
    };

  } catch (error) {
    return {
      success: false,

      symbol:
        stock.symbol,

      token:
        stock.token,

      error:
        error?.message ||
        String(error),

      cause:
        error?.cause?.message ||
        String(
          error?.cause || ""
        ),

      responseTimeMs:
        Date.now() -
        started
    };
  }
}

// ============================================
// MAIN
// ============================================

export default async function handler(
  req,
  res
) {
  if (
    req.method !== "GET" &&
    req.method !== "POST"
  ) {
    return res
      .status(405)
      .json({
        success: false,

        step:
          "METHOD",

        error:
          "Use GET or POST method."
      });
  }

  if (!ACCESS_TOKEN) {
    return res
      .status(500)
      .json({
        success: false,

        step:
          "ACCESS_TOKEN",

        error:
          "NEO_ACCESS_TOKEN missing."
      });
  }

  const started =
    Date.now();

  const results = [];

  // Sequential requests:
  // safer for first verified 50-stock test.

  for (
    const stock of STOCKS
  ) {
    const result =
      await getQuote(stock);

    results.push(result);
  }

  const successful =
    results.filter(
      item =>
        item.success
    );

  const errors =
    results.filter(
      item =>
        !item.success
    );

  return res
    .status(
      successful.length > 0
        ? 200
        : 502
    )
    .json({
      success:
        errors.length === 0,

      step:
        errors.length === 0
          ? "ALL_QUOTES_SUCCESS"
          : "QUOTES_COMPLETED_WITH_ERRORS",

      source:
        "KOTAK NEO",

      baseUrl:
        BASE_URL,

      totalRequested:
        STOCKS.length,

      totalReceived:
        successful.length,

      totalErrors:
        errors.length,

      durationMs:
        Date.now() -
        started,

      stocks:
        successful,

      errors
    });
}
