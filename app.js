// ============================================
// PROTOTYPE-1
// APP CONTROLLER
// REAL KOTAK NEO MARKET DATA
// ============================================


// ============================================
// LOAD MARKET DATA
// ============================================

async function loadRealMarketData() {

  const status =
    document.getElementById("engineStatus");

  try {

    if (status) {
      status.textContent =
        "Connecting to Kotak Neo...";
    }


    // ----------------------------------------
    // USE FRONTEND MARKET DATA CLIENT
    // ----------------------------------------

    if (
      typeof window.fetchMarketData !==
      "function"
    ) {

      throw new Error(
        "market-data.js is not loaded"
      );

    }


    const success =
      await window.fetchMarketData();


    if (!success) {

      throw new Error(
        "Market data request failed"
      );

    }


    const marketData =
      window.MARKET_DATA;


    if (
      !marketData ||
      !marketData.success
    ) {

      throw new Error(
        "Invalid market data state"
      );

    }


    const stocks =
      Object.values(
        marketData.stocks || {}
      );


    if (
      stocks.length === 0
    ) {

      throw new Error(
        "No valid market stocks received"
      );

    }


    console.log(
      "Frontend market data:",
      marketData
    );

    console.log(
      "Valid stock count:",
      stocks.length
    );


    // ----------------------------------------
    // SORT BY PERCENTAGE CHANGE
    // ----------------------------------------

    const sortedStocks =
      [...stocks].sort(
        (a, b) =>
          Number(b.perChange) -
          Number(a.perChange)
      );


    // ----------------------------------------
    // TOP 20
    // ----------------------------------------

    window.REAL_MARKET_DATA =
      stocks;

    window.TOP_20_STOCKS =
      sortedStocks.slice(0, 20);


    displayTop20(
      window.TOP_20_STOCKS
    );


    // ----------------------------------------
    // UPDATE STATUS
    // ----------------------------------------

    if (status) {

      status.textContent =
        `LIVE DATA CONNECTED • ${stocks.length}/50 stocks`;

    }


    // ----------------------------------------
    // UPDATE MARKET DATA STATUS
    // ----------------------------------------

    updateMarketDataStatus(
      stocks.length
    );


    return {
      success: true,
      stocks: stocks,
      top20: window.TOP_20_STOCKS
    };


  } catch (error) {

    console.error(
      "Market data error:",
      error
    );


    if (status) {

      status.textContent =
        "Market Data Error";

    }


    updateMarketDataStatus(
      0
    );


    return {
      success: false,
      error:
        error.message
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

    console.warn(
      "Top 20 container not found"
    );

    return;

  }


  container.innerHTML = "";


  if (
    !Array.isArray(stocks) ||
    stocks.length === 0
  ) {

    container.innerHTML = `
      <div class="empty-state">
        Live market data available,
        but no stocks matched.
      </div>
    `;

    return;

  }


  stocks.forEach(
    function(stock, index) {

      const change =
        Number(stock.perChange) || 0;


      const price =
        Number(stock.ltp) || 0;


      const row =
        document.createElement("div");


      row.className =
        "stock-row";


      row.innerHTML = `

        <div class="stock-rank">
          ${index + 1}
        </div>

        <div class="stock-info">

          <strong>
            ${stock.symbol || "-"}
          </strong>

          <span>
            ${stock.displaySymbol || ""}
          </span>

        </div>

        <div class="stock-price">
          ₹${price.toFixed(2)}
        </div>

        <div class="stock-change">
          ${change >= 0 ? "+" : ""}
          ${change.toFixed(2)}%
        </div>

      `;


      container.appendChild(row);

    }
  );

}


// ============================================
// UPDATE MARKET DATA STATUS
// ============================================

function updateMarketDataStatus(
  count
) {

  const elements =
    document.querySelectorAll(
      "*"
    );


  elements.forEach(
    function(element) {

      const text =
        element.textContent?.trim();


      if (
        text === "Market DataNO DATA" ||
        text === "Market DataNO DATA"
      ) {

        element.textContent =
          `Market Data${count > 0 ? "LIVE" : "NO DATA"}`;

      }

    }
  );

}


// ============================================
// START PROTOTYPE-1
// ============================================

document.addEventListener(
  "DOMContentLoaded",
  function() {

    console.log(
      "Prototype-1 starting..."
    );


    loadRealMarketData();

  }
);


// ============================================
// EXPOSE APP FUNCTIONS
// ============================================

window.loadRealMarketData =
  loadRealMarketData;

window.displayTop20 =
  displayTop20;
