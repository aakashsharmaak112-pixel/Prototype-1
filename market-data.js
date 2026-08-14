// ============================================
// PROTOTYPE-1
// MARKET DATA ENGINE
// SERVER-SIDE KOTAK AUTH + LIVE QUOTES
// ============================================

const MARKET_DATA = {
  source: "KOTAK NEO",
  status: "NOT_CONNECTED",
  lastUpdated: null,
  stocks: {}
};

const MARKET_API_URL = "/api/quotes";

function normalizeSymbol(symbol) {
  if (!symbol) return "";

  return String(symbol)
    .replace(/-EQ$/i, "")
    .trim()
    .toUpperCase();
}

function toNumber(value) {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return 0;
  }

  const number =
    Number(
      String(value)
        .replace(/,/g, "")
        .replace(/%/g, "")
        .trim()
    );

  return Number.isFinite(number)
    ? number
    : 0;
}

function extractQuotes(data) {

  if (!data) return [];

  if (Array.isArray(data)) {
    return data;
  }

  if (
    Array.isArray(
      data.quotes
    )
  ) {
    return data.quotes;
  }

  if (
    Array.isArray(
      data.neoResponse
    )
  ) {
    return data.neoResponse;
  }

  if (
    Array.isArray(
      data.data
    )
  ) {
    return data.data;
  }

  if (
    Array.isArray(
      data.results
    )
  ) {
    return data.results;
  }

  if (
    Array.isArray(
      data.result
    )
  ) {
    return data.result;
  }

  return [];
}

function normalizeNeoQuote(quote) {

  if (
    !quote ||
    typeof quote !== "object"
  ) {
    return null;
  }

  const source =
    quote.data &&
    typeof quote.data === "object"
      ? quote.data
      : quote;

  const symbol =
    normalizeSymbol(
      source.display_symbol ||
      source.displaySymbol ||
      source.symbol ||
      source.trading_symbol ||
      source.pTrdSymbol ||
      source.pScripRefKey ||
      source.neo_symbol
    );

  if (!symbol) {
    return null;
  }

  const price =
    toNumber(
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

  const previousClose =
    toNumber(
      source.previous_close ??
      source.prev_close ??
      source.prevClose ??
      source.previousClose ??
      source.pc ??
      source.PREVIOUS_CLOSE
    );

  let percentChange =
    toNumber(
      source.percentage_change ??
      source.percent_change ??
      source.percentChange ??
      source.change_percent ??
      source.changePercent ??
      source.pChange ??
      source.PERCENTAGE_CHANGE
    );

  let rupeeChange =
    toNumber(
      source.net_change ??
      source.netChange ??
      source.change ??
      source.chg ??
      source.NET_CHANGE
    );

  if (previousClose > 0) {

    percentChange =
      (
        (price - previousClose) /
        previousClose
      ) * 100;

    rupeeChange =
      price -
      previousClose;
  }

  return {
    symbol,
    price:
      Number(
        price.toFixed(2)
      ),
    change:
      Number(
        percentChange.toFixed(2)
      ),
    rupeeChange:
      Number(
        rupeeChange.toFixed(2)
      )
  };
}

function saveMarketData(data) {

  const quotes =
    extractQuotes(data);

  if (!quotes.length) {

    MARKET_DATA.status =
      "ERROR";

    return false;
  }

  const normalized = {};

  quotes.forEach(
    function(quote) {

      const result =
        normalizeNeoQuote(
          quote
        );

      if (!result) {
        return;
      }

      normalized[
        result.symbol
      ] = {
        price:
          result.price,
        change:
          result.change,
        rupeeChange:
          result.rupeeChange
      };
    }
  );

  const count =
    Object.keys(
      normalized
    ).length;

  if (!count) {

    MARKET_DATA.status =
      "ERROR";

    return false;
  }

  MARKET_DATA.stocks =
    normalized;

  MARKET_DATA.lastUpdated =
    new Date().toISOString();

  MARKET_DATA.status =
    "LIVE_DATA_LOADED";

  return true;
}

function getMarketStock(symbol) {
  return (
    MARKET_DATA.stocks[
      normalizeSymbol(symbol)
    ] || null
  );
}

function getAllMarketData() {
  return MARKET_DATA.stocks;
}

function getMarketStatus() {
  return {
    source:
      MARKET_DATA.source,
    status:
      MARKET_DATA.status,
    lastUpdated:
      MARKET_DATA.lastUpdated,
    stockCount:
      Object.keys(
        MARKET_DATA.stocks
      ).length
  };
}

async function fetchMarketData(totp) {

  const cleanTotp =
    String(
      totp || ""
    ).trim();

  if (
    !/^\d{6}$/.test(
      cleanTotp
    )
  ) {

    MARKET_DATA.status =
      "ERROR";

    return false;
  }

  MARKET_DATA.status =
    "LOADING";

  try {

    const response =
      await fetch(
        MARKET_API_URL,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json"
          },

          body:
            JSON.stringify({
              totp:
                cleanTotp
            }),

          cache:
            "no-store"
        }
      );

    const text =
      await response.text();

    let data = null;

    try {

      data =
        text
          ? JSON.parse(text)
          : null;

    } catch {

      MARKET_DATA.status =
        "ERROR";

      return false;
    }

    console.log(
      "KOTAK QUOTES RESPONSE:",
      data
    );

    if (
      !response.ok ||
      data?.success === false
    ) {

      MARKET_DATA.status =
        "ERROR";

      return false;
    }

    return saveMarketData(
      data
    );

  } catch (error) {

    console.error(
      "Market data error:",
      error
    );

    MARKET_DATA.status =
      "ERROR";

    return false;
  }
}

async function connectLiveMarketData(totp) {
  return fetchMarketData(totp);
}

if (
  typeof window !==
  "undefined"
) {

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

console.log(
  "PROTOTYPE-1 MARKET DATA ENGINE READY"
);
