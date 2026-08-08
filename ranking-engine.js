// ============================================
// PROTOTYPE-1
// TOP 20 RANKING ENGINE
// ============================================

const RANKING_ENGINE = {
  status: "READY",
  lastRun: null,
  rankings: [],
  top20: []
};


// --------------------------------------------
// Calculate performance score
// --------------------------------------------

function calculateScore(stock) {

  if (!stock) {
    return 0;
  }

  const change = Number(stock.change) || 0;

  return change;
}


// --------------------------------------------
// Rank stocks
// --------------------------------------------

function rankStocks(marketData) {

  if (!marketData || typeof marketData !== "object") {

    console.warn("No market data available.");

    return [];

  }


  const rankings = Object.entries(marketData).map(
    function ([symbol, data]) {

      return {

        symbol: symbol,

        price: Number(data.price) || 0,

        change: Number(data.change) || 0,

        score: calculateScore(data)

      };

    }
  );


  rankings.sort(
    function (a, b) {

      return b.score - a.score;

    }
  );


  rankings.forEach(
    function (stock, index) {

      stock.rank = index + 1;

    }
  );


  RANKING_ENGINE.rankings = rankings;

  RANKING_ENGINE.top20 =
    rankings.slice(0, 20);

  RANKING_ENGINE.lastRun =
    new Date().toISOString();

  RANKING_ENGINE.status =
    "RANKING_READY";


  return RANKING_ENGINE.top20;

}


// --------------------------------------------
// Get Top 20
// --------------------------------------------

function getTop20() {

  return RANKING_ENGINE.top20;

}


// --------------------------------------------
// Get complete ranking
// --------------------------------------------

function getRankings() {

  return RANKING_ENGINE.rankings;

}


// --------------------------------------------
// Get ranking status
// --------------------------------------------

function getRankingStatus() {

  return {

    status: RANKING_ENGINE.status,

    totalStocks:
      RANKING_ENGINE.rankings.length,

    top20Stocks:
      RANKING_ENGINE.top20.length,

    lastRun:
      RANKING_ENGINE.lastRun

  };

}


// --------------------------------------------
// Run application ranking
// --------------------------------------------

function runAppRanking() {

  if (
    typeof window === "undefined"
  ) {

    return [];

  }


  // Use the 50-stock test data
  // created by app.js

  if (
    !window.TEST_MARKET_DATA
  ) {

    console.error(
      "TEST_MARKET_DATA not available."
    );

    return [];

  }


  return rankStocks(
    window.TEST_MARKET_DATA
  );

}


// --------------------------------------------
// Browser access
// --------------------------------------------

if (typeof window !== "undefined") {

  window.RANKING_ENGINE =
    RANKING_ENGINE;

  window.rankStocks =
    rankStocks;

  window.getTop20 =
    getTop20;

  window.getRankings =
    getRankings;

  window.getRankingStatus =
    getRankingStatus;

  window.runAppRanking =
    runAppRanking;

}


// --------------------------------------------
// Startup
// --------------------------------------------

console.log(
  "--------------------------------"
);

console.log(
  "PROTOTYPE-1 RANKING ENGINE"
);

console.log(
  "Status:",
  RANKING_ENGINE.status
);

console.log(
  "--------------------------------"
);
