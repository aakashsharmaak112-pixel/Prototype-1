// ============================================
// PROTOTYPE-1
// REAL KOTAK NEO MARKET DATA
// ============================================

const API_URL = "/api/quotes";

async function loadRealMarketData() {
  const status = document.getElementById("engineStatus");

  try {
    if (status) {
      status.textContent = "Connecting to Kotak Neo...";
    }

    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        symbols: [
          "ADANIENT",
          "ADANIPORTS",
          "APOLLOHOSP",
          "ASIANPAINT",
          "AXISBANK",
          "BAJAJ-AUTO",
          "BAJFINANCE",
          "BAJAJFINSV",
          "BEL",
          "BHARTIARTL",
          "CIPLA",
          "COALINDIA",
          "DRREDDY",
          "EICHERMOT",
          "ETERNAL",
          "GRASIM",
          "HCLTECH",
          "HDFCBANK",
          "HDFCLIFE",
          "HEROMOTOCO",
          "HINDALCO",
          "HINDUNILVR",
          "ICICIBANK",
          "INDUSINDBK",
          "INFY",
          "ITC",
          "JIOFIN",
          "JSWSTEEL",
          "KOTAKBANK",
          "LT",
          "M&M",
          "MARUTI",
          "NESTLEIND",
          "NTPC",
          "ONGC",
          "POWERGRID",
          "RELIANCE",
          "SBILIFE",
          "SBIN",
          "SHRIRAMFIN",
          "SUNPHARMA",
          "TATACONSUM",
          "TATAMOTORS",
          "TATASTEEL",
          "TCS",
          "TECHM",
          "TITAN",
          "TRENT",
          "ULTRACEMCO",
          "WIPRO"
        ]
      })
    });

    const data = await response.json();

    console.log("KOTAK NEO RESPONSE:", data);

    if (!data.success) {
      throw new Error(data.error || "Market data request failed");
    }

    if (!Array.isArray(data.stocks)) {
      throw new Error("Invalid stocks data received");
    }

    // Store real market data
    window.REAL_MARKET_DATA = data.stocks;

    // Sort by percentage change
    const sortedStocks = [...data.stocks].sort(
      (a, b) => Number(b.perChange) - Number(a.perChange)
    );

    // Top 20
    window.TOP_20_STOCKS = sortedStocks.slice(0, 20);

    displayTop20(window.TOP_20_STOCKS);

    if (status) {
      status.textContent =
        `LIVE DATA CONNECTED • ${data.totalReceived}/${data.totalRequested} stocks`;
    }

    return data;

  } catch (error) {

    console.error("Market data error:", error);

    if (status) {
      status.textContent = "Market Data Error";
    }

    return {
      success: false,
      error: error.message
    };
  }
}


// ============================================
// DISPLAY TOP 20
// ============================================

function displayTop20(stocks) {

  const container =
    document.getElementById("top20List") ||
    document.getElementById("top20");

  if (!container) {
    console.warn("Top 20 container not found");
    return;
  }

  container.innerHTML = "";

  stocks.forEach((stock, index) => {

    const change = Number(stock.perChange);

    const row = document.createElement("div");

    row.className = "stock-row";

    row.innerHTML = `
      <div class="stock-rank">${index + 1}</div>

      <div class="stock-info">
        <strong>${stock.symbol}</strong>
        <span>${stock.displaySymbol || ""}</span>
      </div>

      <div class="stock-price">
        ₹${Number(stock.ltp).toFixed(2)}
      </div>

      <div class="stock-change">
        ${change >= 0 ? "+" : ""}${change.toFixed(2)}%
      </div>
    `;

    container.appendChild(row);
  });
}


// ============================================
// START PROTOTYPE-1
// ============================================

document.addEventListener("DOMContentLoaded", () => {

  console.log("Prototype-1 starting...");

  loadRealMarketData();

});
