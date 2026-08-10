// ============================================
// PROTOTYPE-1
// AI STOCK ASSISTANT
// APP ENGINE
// LIVE MARKET DATA
// ============================================


// ============================================
// NIFTY 50 STOCK LIST
// ============================================

const NIFTY_50_STOCKS = [

  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Financial Services" },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Financial Services" },
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecommunication" },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Construction" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Financial Services" },
  { symbol: "INFY", name: "Infosys", sector: "Information Technology" },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Financial Services" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Financial Services" },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Automobile" },

  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Metals & Mining" },
  { symbol: "ADANIPORTS", name: "Adani Ports", sector: "Services" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare" },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer Durables" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Automobile" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financial Services" },
  { symbol: "BEL", name: "Bharat Electronics", sector: "Capital Goods" },
  { symbol: "CIPLA", name: "Cipla", sector: "Healthcare" },
  { symbol: "COALINDIA", name: "Coal India", sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories", sector: "Healthcare" },
  { symbol: "EICHERMOT", name: "Eicher Motors", sector: "Automobile" },

  { symbol: "ETERNAL", name: "Eternal", sector: "Consumer Services" },
  { symbol: "GRASIM", name: "Grasim Industries", sector: "Construction Materials" },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "Information Technology" },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance", sector: "Financial Services" },
  { symbol: "HINDALCO", name: "Hindalco Industries", sector: "Metals & Mining" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG" },
  { symbol: "ITC", name: "ITC", sector: "FMCG" },
  { symbol: "INDIGO", name: "InterGlobe Aviation", sector: "Services" },
  { symbol: "JSWSTEEL", name: "JSW Steel", sector: "Metals & Mining" },
  { symbol: "JIOFIN", name: "Jio Financial Services", sector: "Financial Services" },

  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Financial Services" },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Automobile" },
  { symbol: "MAXHEALTH", name: "Max Healthcare", sector: "Healthcare" },
  { symbol: "NTPC", name: "NTPC", sector: "Power" },
  { symbol: "NESTLEIND", name: "Nestle India", sector: "FMCG" },
  { symbol: "ONGC", name: "ONGC", sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "POWERGRID", name: "Power Grid", sector: "Power" },
  { symbol: "SHRIRAMFIN", name: "Shriram Finance", sector: "Financial Services" },
  { symbol: "SUNPHARMA", name: "Sun Pharmaceutical", sector: "Healthcare" },
  { symbol: "TATACONSUM", name: "Tata Consumer Products", sector: "FMCG" },

  { symbol: "TATASTEEL", name: "Tata Steel", sector: "Metals & Mining" },
  { symbol: "TCS", name: "Tata Consultancy Services", sector: "Information Technology" },
  { symbol: "TECHM", name: "Tech Mahindra", sector: "Information Technology" },
  { symbol: "TITAN", name: "Titan Company", sector: "Consumer Durables" },
  { symbol: "TRENT", name: "Trent", sector: "Consumer Services" },
  { symbol: "ULTRACEMCO", name: "UltraTech Cement", sector: "Construction Materials" },
  { symbol: "WIPRO", name: "Wipro", sector: "Information Technology" },
  { symbol: "HINDZINC", name: "Hindustan Zinc", sector: "Metals & Mining" },

  // 50th stock
  { symbol: "TATAMOTORS", name: "Tata Motors", sector: "Automobile" }

];


// ============================================
// APP STATE
// ============================================

const APP_STATE = {

  stockCount:
    NIFTY_50_STOCKS.length,

  marketDataStatus:
    "CONNECTING",

  top20: [],

  investmentAmount:
    10000

};


// ============================================
// GET STOCK INFORMATION
// ============================================

function getStockInfo(symbol) {

  return NIFTY_50_STOCKS.find(
    function(stock) {

      return stock.symbol === symbol;

    }
  ) || null;

}


// ============================================
// CALCULATE TOP 20 FROM LIVE DATA
// ============================================

function calculateTop20() {

  const rankings = [];

  const liveData =
    window.MARKET_DATA &&
    window.MARKET_DATA.stocks
      ? window.MARKET_DATA.stocks
      : {};


  NIFTY_50_STOCKS.forEach(
    function(stock) {

      const data =
        liveData[stock.symbol] || {};


      const price =
        Number(data.price) || 0;


      const change =
        Number(data.change) || 0;


      if (price <= 0) {

        return;

      }


      rankings.push({

        symbol:
          stock.symbol,

        name:
          stock.name,

        sector:
          stock.sector,

        price:
          price,

        change:
          change,

        score:
          change

      });

    }
  );


  rankings.sort(
    function(a, b) {

      return b.score - a.score;

    }
  );


  rankings.forEach(
    function(stock, index) {

      stock.rank =
        index + 1;

    }
  );


  APP_STATE.top20 =
    rankings.slice(0, 20);


  return APP_STATE.top20;

}


// ============================================
// INVESTMENT ANALYSIS
// ============================================

function analyzeInvestmentAmount(amount) {

  amount =
    Number(amount);


  if (!amount || amount <= 0) {

    return {

      success: false,

      message:
        "Please valid investment amount enter karein."

    };

  }


  APP_STATE.investmentAmount =
    amount;


  let message;


  if (amount < 5000) {

    message =
      "₹" +
      amount.toLocaleString("en-IN") +
      " ke liye limited quality stocks aur risk control par focus karna better hoga.";

  }

  else if (amount < 25000) {

    message =
      "₹" +
      amount.toLocaleString("en-IN") +
      " ke liye diversification aur risk management ko priority di jayegi.";

  }

  else {

    message =
      "₹" +
      amount.toLocaleString("en-IN") +
      " ke liye multiple sectors mein diversification aur risk management ko priority di jayegi.";

  }


  return {

    success:
      true,

    message:
      message

  };

}


// ============================================
// MARKET DATA ACCESS
// ============================================

function getMarketData() {

  if (
    window.MARKET_DATA &&
    window.MARKET_DATA.stocks
  ) {

    return window.MARKET_DATA.stocks;

  }

  return {};

}


// ============================================
// APP STATUS
// ============================================

function getAppStatus() {

  return {

    stockCount:
      NIFTY_50_STOCKS.length,

    marketData:
      APP_STATE.marketDataStatus,

    top20Count:
      APP_STATE.top20.length,

    investmentAmount:
      APP_STATE.investmentAmount

  };

}


// ============================================
// LOAD LIVE MARKET DATA
// ============================================

async function initializeLiveMarketData() {

  console.log(
    "Connecting to live market data..."
  );


  APP_STATE.marketDataStatus =
    "LOADING";


  if (
    typeof window.fetchMarketData !==
    "function"
  ) {

    console.error(
      "fetchMarketData() not available."
    );


    APP_STATE.marketDataStatus =
      "ERROR";


    return false;

  }


  const success =
    await window.fetchMarketData();


  if (!success) {

    APP_STATE.marketDataStatus =
      "ERROR";


    return false;

  }


  const status =
    window.getMarketStatus
      ? window.getMarketStatus()
      : null;


  if (
    status &&
    status.stockCount > 0
  ) {

    APP_STATE.marketDataStatus =
      "LIVE";


    calculateTop20();


    console.log(
      "LIVE market data connected:",
      status.stockCount,
      "stocks"
    );


    return true;

  }


  APP_STATE.marketDataStatus =
    "NO_DATA";


  return false;

}


// ============================================
// BROWSER ACCESS
// ============================================

if (typeof window !== "undefined") {

  window.NIFTY_50_STOCKS =
    NIFTY_50_STOCKS;

  window.APP_STATE =
    APP_STATE;

  window.calculateTop20 =
    calculateTop20;

  window.getStockInfo =
    getStockInfo;

  window.analyzeInvestmentAmount =
    analyzeInvestmentAmount;

  window.getMarketData =
    getMarketData;

  window.getAppStatus =
    getAppStatus;

  window.initializeLiveMarketData =
    initializeLiveMarketData;

}


// ============================================
// STARTUP
// ============================================

console.log(
  "================================"
);

console.log(
  "PROTOTYPE-1 APP ENGINE"
);

console.log(
  "Nifty 50:",
  NIFTY_50_STOCKS.length
);

console.log(
  "Market Data:",
  APP_STATE.marketDataStatus
);

console.log(
  "================================"
);
