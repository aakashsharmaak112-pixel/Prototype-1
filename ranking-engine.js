// ============================================
// PROTOTYPE-1
// TOP 20 RANKING ENGINE
// Step 3: Stock Ranking Structure
// ============================================

const RANKING_ENGINE = {
  status: "READY",
  lastRun: null,
  rankings: [],
  top20: []
};


// --------------------------------------------
// Calculate a simple performance score
// --------------------------------------------

function calculateScore(stock) {

  if (!stock) {
    return 0;
  }

  const change = Number(stock.change) || 0;

  // Temporary score.
  // Real market factors will be added later.
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

  const stocks = Object.entries(marketData);

  const rankings = stocks.map(([symbol, data]) => {

    return {
      symbol: symbol,
      price: Number(data.price) || 0,
      change: Number(data.change) || 0,
      score: calculateScore(data)
    };

  });

  rankings.sort((a, b) => b.score - a.score);

  rankings.forEach((stock, index) => {
    stock.rank = index + 1;
  });

  RANKING_ENGINE.rankings = rankings;
  RANKING_ENGINE.top20 = rankings.slice(0, 20);
  RANKING_ENGINE.lastRun = new Date().toISOString();
  RANKING_ENGINE.status = "RANKING_READY";

  return rankings;
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
    totalStocks: RANKING_ENGINE.rankings.length,
    top20Stocks: RANKING_ENGINE.top20.length,
    lastRun: RANKING_ENGINE.lastRun
  };

}


// --------------------------------------------
// Make engine available to browser
// --------------------------------------------

if (typeof window !== "undefined") {

  window.RANKING_ENGINE = RANKING_ENGINE;

  window.rankStocks = rankStocks;

  window.getTop20 = getTop20;

  window.getRankings = getRankings;

  window.getRankingStatus = getRankingStatus;

}


// --------------------------------------------
// Startup
// --------------------------------------------

console.log("--------------------------------");
console.log("PROTOTYPE-1 RANKING ENGINE");
console.log("--------------------------------");
console.log("Status:", RANKING_ENGINE.status);
console.log("--------------------------------");
