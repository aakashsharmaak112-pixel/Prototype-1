// ============================================
// PROTOTYPE-1
// MARKET DATA ENGINE
// LIVE KOTAK NEO MARKET DATA
// TOTP -> POST /api/quotes
// ============================================

const MARKET_DATA = {
  source: "KOTAK NEO",
  status: "NOT_CONNECTED",
  lastUpdated: null,
  stocks: {}
};

const MARKET_API_URL = "/api/quotes";

// ============================================
// SYMBOL NORMALIZER
// ============================================

function normalizeSymbol(symbol) {
  if (!symbol) return "";

  return String(symbol)
    .replace(/-EQ$/i, "")
    .trim()
    .toUpperCase();
}

// ============================================
// NUMBER CONVERTER
// ============================================

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number = Number(
    String(value)
      .replace(/,/g, "")
      .replace(/%/g, "")
      .trim()
  );

  return Number.isFinite(number) ? number : 0;
}

// ============================================
// FIND QUOTES ARRAY
// ============================================

function extractQuotes(data) {
  if (!data) return [];

  if (Array.isArray(data)) return data;

  if (Array.isArray(data.quotes)) return data.quotes;

  if (Array.isArray(data.data)) return data.data;

  if (Array.isArray(data.stocks)) return data.stocks;

  if (Array.isArray(data.results)) return data.results;

  if (Array.isArray(data.result)) return data.result;

  return [];
}

// ============================================
// NORMALIZE KOTAK NEO QUOTE
// ============================================

function normalizeNeoQuote(quote) {
  if (!quote || typeof quote !== "object") {
    return null;
  }

  const symbol = normalizeSymbol(
    quote.display_symbol ||
    quote.symbol ||
    quote.trading_symbol ||
    quote.pTrdSymbol ||
    quote.pScripRefKey ||
    quote.neo_symbol
  );

  if (!symbol) {
    return null;
  }

  const source =
    quote.data &&
    typeof quote.data === "object"
      ? quote.data
      : quote;

  const price = toNumber(
    source.ltp ??
    source.LTP ??
    source.last_price ??
    source.lastPrice ??
    source.close_price ??
    source.close
  );

  if (price <= 0) {
    return null;
  }

  const previousClose = toNumber(
    source.previous_close ??
    source.prev_close ??
    source.prevClose ??
    source.previousClose ??
    source.pc ??
    source.PREVIOUS_CLOSE
  );

  let percentChange = toNumber(
    source.percentage_change ??
    source.percent_change ??
    source.percentChange ??
    source.change_percent ??
    source.changePercent ??
    source.pChange ??
    source.PERCENTAGE_CHANGE
  );

  let rupeeChange = toNumber(
    source.net_change ??
    source.netChange ??
    source.change ??
    source.chg ??
    source.NET_CHANGE
  );

  if (previousClose > 0) {
    percentChange =
      ((price - previousClose) / previousClose) * 100;

    rupeeChange =
      price - previousClose;
  }

  return {
    symbol,
    price: Number(price.toFixed(2)),
    change: Number(percentChange.toFixed(2)),
    rupeeChange: Number(rupeeChange.toFixed(2))
  };
}

// ============================================
// SAVE MARKET DATA
// ============================================

function saveMarketData(data) {
  if (!data) {
    console.error("Invalid market data response.");
    MARKET_DATA.status = "ERROR";
    return false;
  }

  const quotes = extractQuotes(data);

  if (!quotes.length) {
    console.error(
      "No quotes array found in API response.",
      data
    );
    MARKET_DATA.status = "ERROR";
    return false;
  }

  const normalized = {};

  quotes.forEach(function(quote) {
    const result = normalizeNeoQuote(quote);

    if (!result) return;

    normalized[result.symbol] = {
      price: result.price,
      change: result.change,
      rupeeChange: result.rupeeChange
    };
  });

  const stockCount = Object.keys(normalized).length;

  if (stockCount === 0) {
    console.error(
      "Quotes received but no valid stock prices found.",
      quotes
    );
    MARKET_DATA.status = "ERROR";
    return false;
  }

  MARKET_DATA.stocks = normalized;
  MARKET_DATA.lastUpdated = new Date().toISOString();
  MARKET_DATA.status = "LIVE_DATA_LOADED";

  console.log(
    "LIVE market data loaded:",
    stockCount,
    "stocks"
  );

  return true;
}

// ============================================
// GET SINGLE STOCK
// ============================================

function getMarketStock(symbol) {
  const key = normalizeSymbol(symbol);

  return MARKET_DATA.stocks[key] || null;
}

// ============================================
// GET ALL MARKET DATA
// ============================================

function getAllMarketData() {
  return MARKET_DATA.stocks;
}

// ============================================
// GET MARKET STATUS
// ============================================

function getMarketStatus() {
  return {
    source: MARKET_DATA.source,
    status: MARKET_DATA.status,
    lastUpdated: MARKET_DATA.lastUpdated,
    stockCount: Object.keys(MARKET_DATA.stocks).length
  };
}

// ============================================
// FETCH LIVE MARKET DATA
// TOTP IS SENT ONLY IN POST BODY
// ============================================

async function fetchMarketData(totp) {
  try {
    const cleanTotp = String(totp || "").trim();

    if (!/^\d{6}$/.test(cleanTotp)) {
      MARKET_DATA.status = "ERROR";

      console.error(
        "Current 6-digit TOTP required."
      );

      return false;
    }

    MARKET_DATA.status = "LOADING";

    console.log(
      "Connecting to Kotak Neo live market data..."
    );

    const response = await fetch(
      MARKET_API_URL,
      {
        method: "POST",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({
          totp: cleanTotp
        })
      }
    );

    const responseText = await response.text();

    let data = null;

    try {
      data = responseText
        ? JSON.parse(responseText)
        : null;
    } catch (parseError) {
      console.error(
        "Quotes API returned non-JSON response:",
        responseText
      );

      MARKET_DATA.status = "ERROR";

      return false;
    }

    console.log(
      "Quotes API response:",
      data
    );

    if (!response.ok) {
      console.error(
        "Quotes API HTTP error:",
        response.status,
        data
      );

      MARKET_DATA.status = "ERROR";

      return false;
    }

    if (data && data.success === false) {
      console.error(
        "Quotes API returned success=false:",
        data
      );

      MARKET_DATA.status = "ERROR";

      return false;
    }

    const success = saveMarketData(data);

    if (!success) {
      MARKET_DATA.status = "ERROR";
      return false;
    }

    return true;

  } catch (error) {
    console.error(
      "Market data connection error:",
      error
    );

    MARKET_DATA.status = "ERROR";

    return false;
  }
}

// ============================================
// CONNECT LIVE MARKET DATA
// PUBLIC FUNCTION FOR INDEX.HTML
// ============================================

async function connectLiveMarketData(totp) {
  return await fetchMarketData(totp);
}

// ============================================
// BROWSER ACCESS
// ============================================

if (typeof window !== "undefined") {

  window.MARKET_DATA =
    MARKET_DATA;

  window.saveMarketData =
    saveMarketData;

  window.getMarketStock =
    getMarketStock;

  window.getAllMarketData =
    getAllMarketData;

  window.getMarketStatus =
    getMarketStatus;

  window.fetchMarketData =
    fetchMarketData;

  window.connectLiveMarketData =
    connectLiveMarketData;
}

// ============================================
// STARTUP
// ============================================

console.log(
  "================================"
);

console.log(
  "PROTOTYPE-1 MARKET DATA ENGINE"
);

console.log(
  "Source: KOTAK NEO"
);

console.log(
  "API: POST /api/quotes"
);

console.log(
  "TOTP: REQUIRED AT REQUEST TIME"
);

console.log(
  "Status:",
  MARKET_DATA.status
);

console.log(
  "================================"
);
