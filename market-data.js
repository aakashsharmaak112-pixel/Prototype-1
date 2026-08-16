// ============================================
// PROTOTYPE-1
// MARKET DATA ENGINE
// KOTAK NEO LIVE QUOTES
// ============================================

const MARKET_API_URL = "/api/quotes";


// ============================================
// NIFTY 50 STOCK LIST
// ============================================

const NIFTY_50_STOCKS = [
  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Metals & Mining" },
  { symbol: "ADANIPORTS", name: "Adani Ports", sector: "Services" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare" },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer Durables" },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Financial Services" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Automobile" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Financial Services" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financial Services" },
  { symbol: "BEL", name: "Bharat Electronics", sector: "Defence" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecommunication" },
  { symbol: "CIPLA", name: "Cipla", sector: "Healthcare" },
  { symbol: "COALINDIA", name: "Coal India", sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "DRREDDY", name: "Dr Reddy's Laboratories", sector: "Healthcare" },
  { symbol: "EICHERMOT", name: "Eicher Motors", sector: "Automobile" },
  { symbol: "ETERNAL", name: "Eternal", sector: "Consumer Services" },
  { symbol: "GRASIM", name: "Grasim Industries", sector: "Cement & Building Materials" },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "Information Technology" },
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Financial Services" },
  { symbol: "HDFCLIFE", name: "HDFC Life", sector: "Financial Services" },
  { symbol: "HEROMOTOCO", name: "Hero MotoCorp", sector: "Automobile" },
  { symbol: "HINDALCO", name: "Hindalco Industries", sector: "Metals & Mining" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "Fast Moving Consumer Goods" },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Financial Services" },
  { symbol: "INDUSINDBK", name: "IndusInd Bank", sector: "Financial Services" },
  { symbol: "INFY", name: "Infosys", sector: "Information Technology" },
  { symbol: "ITC", name: "ITC", sector: "Fast Moving Consumer Goods" },
  { symbol: "JIOFIN", name: "Jio Financial Services", sector: "Financial Services" },
  { symbol: "JSWSTEEL", name: "JSW Steel", sector: "Metals & Mining" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Financial Services" },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Construction" },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Automobile" },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Automobile" },
  { symbol: "NESTLEIND", name: "Nestle India", sector: "Fast Moving Consumer Goods" },
  { symbol: "NTPC", name: "NTPC", sector: "Power" },
  { symbol: "ONGC", name: "ONGC", sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "POWERGRID", name: "Power Grid Corporation", sector: "Power" },
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "SBILIFE", name: "SBI Life Insurance", sector: "Financial Services" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Financial Services" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance", sector: "Financial Services" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Healthcare" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products", sector: "Fast Moving Consumer Goods" },
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Automobile" },
  { symbol: "TATASTEEL", name: "Tata Steel", sector: "Metals & Mining" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "Information Technology" },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "Information Technology" },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer Durables" },
  { symbol: "TRENT", name: "Trent", sector: "Consumer Services" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", sector: "Cement & Building Materials" },
  { symbol: "WIPRO", name: "Wipro", sector: "Information Technology" }
];


// ============================================
// GLOBAL MARKET DATA
// ============================================

window.MARKET_DATA = {
  success: false,
  stocks: {},
  received: 0,
  requested: 50,
  timestamp: null
};


// ============================================
// FETCH LIVE MARKET DATA
// ============================================

async function fetchMarketData(totp) {

  console.log("=================================");
  console.log("Prototype-1 Market Data");
  console.log("Fetching Kotak Neo quotes...");
  console.log("=================================");

  try {

    const response = await fetch(
      MARKET_API_URL,
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          totp: String(totp || "").trim(),
          symbols: NIFTY_50_STOCKS.map(
            stock => stock.symbol
          )
        }),

        cache: "no-store"
      }
    );


    const text = await response.text();

    console.log(
      "Kotak API HTTP status:",
      response.status
    );

    console.log(
      "Kotak API raw response:",
      text
    );


    let data;

    try {

      data = JSON.parse(text);

    } catch (error) {

      throw new Error(
        "API ne valid JSON response nahi diya."
      );

    }


    if (!response.ok) {

      throw new Error(
        data.error ||
        data.message ||
        `API HTTP ${response.status}`
      );

    }


    if (!data.success && !Array.isArray(data.stocks)) {

      throw new Error(
        data.error ||
        data.message ||
        "Market data request failed."
      );

    }


    if (!Array.isArray(data.stocks)) {

      throw new Error(
        "API response me stocks array nahi mila."
      );

    }


    // ========================================
    // CONVERT API ARRAY → SYMBOL MAP
    // ========================================

    const stockMap = {};


    data.stocks.forEach(
      function (quote) {

        if (
          !quote ||
          !quote.symbol
        ) {
          return;
        }


        const symbol =
          String(
            quote.symbol
          )
            .replace(
              /-EQ$/i,
              ""
            )
            .toUpperCase();


        const price =
          Number(
            quote.ltp
          );


        const change =
          Number(
            quote.perChange
          );


        if (
          !Number.isFinite(price) ||
          price <= 0
        ) {
          return;
        }


        stockMap[symbol] = {

          symbol: symbol,

          price: price,

          ltp: price,

          change:
            Number.isFinite(change)
              ? change
              : 0,

          perChange:
            Number.isFinite(change)
              ? change
              : 0,

          displaySymbol:
            quote.displaySymbol ||
            `${symbol}-EQ`,

          exchange:
            quote.exchange ||
            "nse_cm",

          token:
            quote.token || "",

          open:
            Number(quote.open) || null,

          high:
            Number(quote.high) || null,

          low:
            Number(quote.low) || null,

          close:
            Number(quote.close) || null,

          lastUpdated:
            quote.lastUpdated ||
            null

        };

      }
    );


    // ========================================
    // SAVE GLOBAL DATA
    // ========================================

    window.MARKET_DATA = {

      success: true,

      stocks: stockMap,

      received:
        Object.keys(stockMap).length,

      requested:
        data.totalRequested ||
        NIFTY_50_STOCKS.length,

      timestamp:
        Date.now()

    };


    // ========================================
    // ALSO SAVE ARRAY FORMAT
    // ========================================

    window.REAL_MARKET_DATA =
      data.stocks;


    console.log(
      "MARKET_DATA:",
      window.MARKET_DATA
    );


    console.log(
      "Live stocks received:",
      Object.keys(stockMap).length
    );


    // ========================================
    // STATUS
    // ========================================

    const marketStatus =
      document.getElementById(
        "marketStatus"
      );


    if (marketStatus) {

      marketStatus.innerText =
        `LIVE • ${Object.keys(stockMap).length}/${NIFTY_50_STOCKS.length}`;

      marketStatus.className =
        "status-ready";

    }


    // ========================================
    // RETURN SUCCESS
    // ========================================

    return (
      Object.keys(stockMap).length > 0
    );

  }


  catch (error) {

    console.error(
      "Market data error:",
      error
    );


    window.MARKET_DATA = {

      success: false,

      stocks: {},

      received: 0,

      requested:
        NIFTY_50_STOCKS.length,

      timestamp: Date.now(),

      error:
        error?.message ||
        String(error)

    };


    const marketStatus =
      document.getElementById(
        "marketStatus"
      );


    if (marketStatus) {

      marketStatus.innerText =
        "ERROR";

      marketStatus.className =
        "status-error";

    }


    return false;

  }

}


// ============================================
// HELPER FUNCTIONS
// ============================================

function getMarketStock(symbol) {

  const key =
    String(
      symbol || ""
    )
      .replace(
        /-EQ$/i,
        ""
      )
      .toUpperCase();


  return (
    window.MARKET_DATA &&
    window.MARKET_DATA.stocks
      ? window.MARKET_DATA.stocks[key] || null
      : null
  );

}


function getAllMarketData() {

  if (
    !window.MARKET_DATA ||
    !window.MARKET_DATA.stocks
  ) {

    return {};

  }

  return window.MARKET_DATA.stocks;

}


function getMarketStatus() {

  return {

    success:
      Boolean(
        window.MARKET_DATA?.success
      ),

    received:
      Object.keys(
        window.MARKET_DATA?.stocks || {}
      ).length,

    requested:
      window.MARKET_DATA?.requested ||
      50

  };

}


// ============================================
// EXPORT TO WINDOW
// ============================================

window.fetchMarketData =
  fetchMarketData;

window.getMarketStock =
  getMarketStock;

window.getAllMarketData =
  getAllMarketData;

window.getMarketStatus =
  getMarketStatus;

window.NIFTY_50_STOCKS =
  NIFTY_50_STOCKS;


console.log(
  "market-data.js loaded successfully."
);

console.log(
  "NIFTY 50 stocks:",
  NIFTY_50_STOCKS.length
);
