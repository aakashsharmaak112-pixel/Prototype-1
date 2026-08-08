// ============================================
// PROTOTYPE-1
// AI STOCK ASSISTANT
// APP ENGINE
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
  { symbol: "BEL", name: "Bharat Electronics", sector: "Capital Goods" }

];


// ============================================
// REMOVE DUPLICATE STOCKS
// ============================================

const UNIQUE_STOCKS = [];

const SEEN_SYMBOLS = {};

NIFTY_50_STOCKS.forEach(function(stock) {

  if (!SEEN_SYMBOLS[stock.symbol]) {

    SEEN_SYMBOLS[stock.symbol] = true;

    UNIQUE_STOCKS.push(stock);

  }

});


// ============================================
// APP STATUS
// ============================================

const APP_STATE = {

  stockCount: UNIQUE_STOCKS.length,

  marketDataStatus: "TEST DATA",

  rankingStatus: "READY",

  top20: [],

  investmentAmount: 10000

};


// ============================================
// CREATE TEST MARKET DATA
// ============================================
// IMPORTANT:
// These are ONLY test values.
// They are NOT live market prices.
// ============================================

const APP_TEST_DATA = {};

UNIQUE_STOCKS.forEach(function(stock, index) {

  APP_TEST_DATA[stock.symbol] = {

    price: 500 + (index * 37),

    change: Number(
      ((index % 11) - 4) * 0.65
    .toFixed(2)

    )

  };

});


// ============================================
// RUN RANKING
// ============================================

function runAppRanking() {

  if (
    typeof window.rankStocks !== "function"
  ) {

    console.warn(
      "Ranking engine not loaded."
    );

    return [];

  }

  const result =
    window.rankStocks(APP_TEST_DATA);

  APP_STATE.top20 =
    result.slice(0, 20);

  APP_STATE.rankingStatus =
    "TOP 20 READY";

  console.log(
    "Prototype-1 Top 20:",
    APP_STATE.top20
  );

  return APP_STATE.top20;

}


// ============================================
// GET STOCK INFORMATION
// ============================================

function getStockInfo(symbol) {

  return UNIQUE_STOCKS.find(
    function(stock) {

      return stock.symbol === symbol;

    }
  ) || null;

}


// ============================================
// INVESTMENT ANALYSIS
// ============================================

function analyzeInvestmentAmount(amount) {

  amount = Number(amount);

  if (!amount || amount <= 0) {

    return {
      success: false,
      message:
        "Please enter a valid investment amount."
    };

  }


  APP_STATE.investmentAmount = amount;


  if (amount < 5000) {

    return {
      success: true,
      message:
        "₹" +
        amount.toLocaleString("en-IN") +
        " ke liye limited stocks aur risk control par focus karna better hoga."
    };

  }


  if (amount < 25000) {

    return {
      success: true,
      message:
        "₹" +
        amount.toLocaleString("en-IN") +
        " ke liye diversification aur risk management ko priority di jayegi."
    };

  }


  return {
    success: true,
    message:
      "₹" +
      amount.toLocaleString("en-IN") +
      " ke liye multiple sectors mein diversification aur risk management ko priority di jayegi."
  };

}


// ============================================
// BROWSER ACCESS
// ============================================

if (typeof window !== "undefined") {

  window.NIFTY_50_STOCKS =
    UNIQUE_STOCKS;

  window.APP_STATE =
    APP_STATE;

  window.APP_TEST_DATA =
    APP_TEST_DATA;

  window.runAppRanking =
    runAppRanking;

  window.getStockInfo =
    getStockInfo;

  window.analyzeInvestmentAmount =
    analyzeInvestmentAmount;

}


// ============================================
// STARTUP
// ============================================

console.log(
  "--------------------------------"
);

console.log(
  "PROTOTYPE-1 APP ENGINE"
);

console.log(
  "Nifty 50 stocks:",
  UNIQUE_STOCKS.length
);

console.log(
  "Market data:",
  APP_STATE.marketDataStatus
);

console.log(
  "Ranking:",
 
