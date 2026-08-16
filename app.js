// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + SMART ALLOCATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  // ==========================================
  // GLOBAL CONFIG
  // ==========================================

  const TARGET_STOCKS = 5;
  const MAX_STOCK_ALLOCATION = 0.35;

  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener("DOMContentLoaded", function () {

    console.log("Prototype-1 app.js started.");

    const amountInput =
      document.getElementById("amount");

    const totpInput =
      document.getElementById("totp");

    const connectButton =
      document.getElementById("connectButton");

    const analyzeButton =
      document.getElementById("analyzeButton");

    const recommendation =
      document.getElementById("recommendation");

    const status =
      document.getElementById("marketStatus");

    const list =
      document.getElementById("top20List");

    const errorBox =
      document.getElementById("errorBox");

    const stockCount =
      document.getElementById("stockCount");


    // ========================================
    // BASIC ELEMENT CHECK
    // ========================================

    if (!amountInput ||
        !totpInput ||
        !connectButton ||
        !analyzeButton ||
        !recommendation ||
        !status ||
        !list) {

      console.error(
        "Prototype-1 required DOM elements missing."
      );

      return;
    }


    // ========================================
    // ERROR FUNCTIONS
    // ========================================

    function clearError() {

      if (!errorBox) {
        return;
      }

      errorBox.style.display = "none";
      errorBox.innerText = "";

    }


    function showError(message) {

      if (!errorBox) {
        return;
      }

      errorBox.innerText =
        message || "Unknown error.";

      errorBox.style.display = "block";

    }


    // ========================================
    // STOCK COUNT
    // ========================================

    if (
      window.NIFTY_50_STOCKS &&
      Array.isArray(window.NIFTY_50_STOCKS)
    ) {

      stockCount.innerText =
        window.NIFTY_50_STOCKS.length;

    }


    // ========================================
    // CONNECT LIVE MARKET DATA
    // ========================================

    connectButton.addEventListener(
      "click",
      async function () {

        console.log(
          "Connect Live Market Data clicked."
        );

        clearError();

        const totp =
          String(
            totpInput.value || ""
          ).trim();


        // ------------------------------------
        // TOTP VALIDATION
        // ------------------------------------

        if (!/^\d{6}$/.test(totp)) {

          status.innerText =
            "TOTP REQUIRED";

          status.className =
            "status-pending";

          list.innerHTML =
            `
            <p class="note">
              Current 6-digit TOTP enter karein.
            </p>
            `;

          showError(
            "Please current 6-digit Kotak Neo TOTP enter karein."
          );

          totpInput.focus();

          return;

        }


        // ------------------------------------
        // CHECK MARKET-DATA.JS
        // ------------------------------------

        if (
          typeof window.fetchMarketData !==
          "function"
        ) {

          console.error(
            "fetchMarketData() not found."
          );

          status.innerText =
            "ENGINE ERROR";

          status.className =
            "status-error";

          list.innerHTML =
            `
            <p class="note">
              Market engine available nahi hai.
            </p>
            `;

          showError(
            "market-data.js load nahi hua ya fetchMarketData() function available nahi hai."
          );

          return;

        }


        // ------------------------------------
        // LOADING
        // ------------------------------------

        connectButton.disabled = true;

        connectButton.innerText =
          "Connecting...";

        status.innerText =
          "LOADING";

        status.className =
          "status-pending";

        list.innerHTML =
          `
          <p class="note">
            Kotak Neo se live market data load ho raha hai...
          </p>
          `;


        try {

          console.log(
            "Calling fetchMarketData(totp)..."
          );


          const result =
            await window.fetchMarketData(
              totp
            );


          console.log(
            "fetchMarketData result:",
            result
          );


          // ----------------------------------
          // SUCCESS
          // ----------------------------------

          if (result === true) {

            loadTop20();

            return;

          }


          // Some market-data implementations
          // return an object instead of true.

          if (
            result &&
            typeof result === "object" &&
            result.success === true
          ) {

            loadTop20();

            return;

          }


          // ----------------------------------
          // FAILED
          // ----------------------------------

          status.innerText =
            "ERROR";

          status.className =
            "status-error";

          list.innerHTML =
            `
            <p class="note">
              Kotak Neo live quotes request failed.
            </p>
            `;

          let errorMessage =
            "Kotak Neo live market data request failed.";

          if (
            result &&
            typeof result === "object"
          ) {

            errorMessage =
              result.error ||
              result.message ||
              errorMessage;

          }

          showError(
            errorMessage
          );

        }

        catch (error) {

          console.error(
            "Market connection error:",
            error
          );

          status.innerText =
            "ERROR";

          status.className =
            "status-error";

          list.innerHTML =
            `
            <p class="note">
              Connection error.
            </p>
            `;

          showError(
            error.message ||
            "Unexpected Kotak Neo connection error."
          );

        }

        finally {

          connectButton.disabled =
            false;

          connectButton.innerText =
            "Connect Live Market Data";

        }

      }
    );


    // ========================================
    // ANALYZE INVESTMENT
    // ========================================

    analyzeButton.addEventListener(
      "click",
      function () {

        clearError();

        const amount =
          Number(
            amountInput.value
          );


        if (
          !amount ||
          amount <= 0
        ) {

          recommendation.innerHTML =
            "Please valid investment amount enter karein.";

          return;

        }


        try {

          if (
            typeof window.analyzeInvestmentAmount !==
            "function"
          ) {

            recommendation.innerHTML =
              "Investment analysis engine available nahi hai.";

            return;

          }


          const result =
            window.analyzeInvestmentAmount(
              amount
            );


          if (
            result &&
            result.success
          ) {

            recommendation.innerHTML =
              result.html ||
              result.message ||
              "Investment plan ready.";

          }

          else {

            recommendation.innerHTML =
              result &&
              result.message
                ? result.message
                : "Investment analysis available nahi hai.";

          }

        }

        catch (error) {

          console.error(
            "Investment analysis error:",
            error
          );

          recommendation.innerHTML =
            "Investment analysis mein error aaya.";

          showError(
            error.message
          );

        }

      }
    );


    // ========================================
    // BUILD TOP 20
    // ========================================

    function buildTop20Directly() {

      if (
        Array.isArray(
          window.TOP_20_STOCKS
        )
      ) {

        const directStocks =
          window.TOP_20_STOCKS
            .map(normalizeStock)
            .filter(isValidStock);

        if (directStocks.length) {

          return directStocks
            .sort(
              function (a, b) {
                return b.change - a.change;
              }
            )
            .slice(0, 20);

        }

      }


      if (
        !window.NIFTY_50_STOCKS ||
        !Array.isArray(
          window.NIFTY_50_STOCKS
        )
      ) {

        console.error(
          "NIFTY_50_STOCKS not available."
        );

        return [];

      }


      const liveStocks =
        getStocksFromMarketData();


      if (!liveStocks.length) {

        return [];

      }


      const liveMap =
        new Map();


      liveStocks.forEach(
        function (stock) {

          const normalized =
            normalizeStock(stock);

          if (
            isValidStock(normalized)
          ) {

            liveMap.set(
              normalized.symbol,
              normalized
            );

          }

        }
      );


      const rankings = [];


      window.NIFTY_50_STOCKS.forEach(
        function (stock) {

          const symbol =
            String(
              stock.symbol || ""
            )
              .replace(
                /-EQ$/i,
                ""
              )
              .trim()
              .toUpperCase();


          const live =
            liveMap.get(symbol);


          if (!live) {

            return;

          }


          rankings.push({

            symbol:
              symbol,

            name:
              stock.name ||
              live.name ||
              symbol,

            sector:
              stock.sector ||
              live.sector ||
              "Nifty 50",

            price:
              live.price,

            change:
              live.change

          });

        }
      );


      rankings.sort(
        function (a, b) {

          return b.change - a.change;

        }
      );


      return rankings.slice(
        0,
        20
      );

    }


    // ========================================
    // LOAD TOP 20
    // ========================================

    function loadTop20() {

      const top20 =
        buildTop20Directly();


      console.log(
        "TOP 20:",
        top20
      );


      if (!top20.length) {

        status.innerText =
          "LIVE • DATA MISMATCH";

        status.className =
          "status-pending";

        list.innerHTML =
          `
          <p class="note">
            Live market data received, but valid Nifty 50 prices were not matched.
          </p>
          `;

        return;

      }


      // Save normalized top 20 for
      // investment engine.

      window.TOP_20_STOCKS =
        top20;


      status.innerText =
        "LIVE";

      status.className =
        "status-ready";


      list.innerHTML =
        "";


      top20.forEach(
        function (stock, index) {

          const row =
            document.createElement(
              "div"
            );

          row.className =
            "stock";


          const change =
            Number(
              stock.change
            ) || 0;


          const changeClass =
            change >= 0
              ? "positive"
              : "negative";


          const changeText =
            (
              change >= 0
                ? "+"
                : ""
            ) +
            change.toFixed(2) +
            "%";


          row.innerHTML =

            `
            <div class="stock-left">

              <div class="rank">
                ${index + 1}
              </div>

              <div>

                <div class="stock-name">
                  ${escapeHtml(stock.name)}
                </div>

                <div class="stock-sector">
                  ${escapeHtml(stock.symbol)}
                  • Nifty 50
                </div>

              </div>

            </div>

            <div class="stock-change">

              <div class="${changeClass}">
                ${changeText}
              </div>

              <div class="stock-sector">
                ₹${Number(stock.price)
                  .toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
              </div>

            </div>
            `;


          list.appendChild(
            row
          );

        }
      );

    }


    // ========================================
    // NORMALIZE STOCK
    // ========================================

    function normalizeStock(stock) {

      stock =
        stock || {};


      const symbol =
        String(
          stock.symbol ||
          stock.neoSymbol ||
          stock.displaySymbol ||
          ""
        )
          .replace(
            /-EQ$/i,
            ""
          )
          .trim()
          .toUpperCase();


      const name =
        String(
          stock.name ||
          stock.companyName ||
          stock.displaySymbol ||
          symbol
        ).trim();


      const price =
        Number(
          stock.price ??
          stock.ltp ??
          stock.lastPrice ??
          stock.close ??
          0
        );


      const change =
        Number(
          stock.change ??
          stock.perChange ??
          stock.percentChange ??
          0
        );


      const sector =
        String(
          stock.sector ||
          "Nifty 50"
        );


      return {

        symbol:
          symbol,

        name:
          name,

        sector:
          sector,

        price:
          price,

        change:
          change

      };

    }


    // ========================================
    // VALID STOCK
    // ========================================

    function isValidStock(stock) {

      return (
        stock &&
        stock.symbol &&
        Number.isFinite(stock.price) &&
        stock.price > 0 &&
        Number.isFinite(stock.change)
      );

    }


    // ========================================
    // MARKET DATA READER
    // ========================================

    function getStocksFromMarketData() {

      const result = [];

      const market =
        window.MARKET_DATA;


      if (!market) {

        return result;

      }


      if (
        Array.isArray(
          market.stocks
        )
      ) {

        return market.stocks;

      }


      if (
        market.stocks &&
        typeof market.stocks === "object"
      ) {

        Object.keys(
          market.stocks
        ).forEach(
          function (key) {

            const item =
              market.stocks[key] ||
              {};


            result.push({

              symbol:
                item.symbol ||
                key,

              name:
                item.name ||
                item.companyName ||
                item.displaySymbol ||
                key,

              sector:
                item.sector ||
                "Nifty 50",

              price:
                item.price ??
                item.ltp ??
                item.lastPrice ??
                0,

              change:
                item.change ??
                item.perChange ??
                item.percentChange ??
                0

            });

          }
        );

      }


      return result;

    }


    // ========================================
    // HTML ESCAPE
    // ========================================

    function escapeHtml(value) {

      return String(
        value || ""
      )
        .replace(
          /&/g,
          "&amp;"
        )
        .replace(
          /</g,
          "&lt;"
        )
        .replace(
          />/g,
          "&gt;"
        )
        .replace(
          /"/g,
          "&quot;"
        )
        .replace(
          /'/g,
          "&#039;"
        );

    }


    console.log(
      "Prototype-1 event listeners ready."
    );

  });


  // ==========================================
  // MAIN INVESTMENT FUNCTION
  // ==========================================

  window.analyzeInvestmentAmount =
    function (amount) {

      amount =
        Number(amount);


      if (
        !amount ||
        amount <= 0
      ) {

        return {

          success: false,

          message:
            "Please valid investment amount enter karein."

        };

      }


      let stocks = [];


      if (
        Array.isArray(
          window.TOP_20_STOCKS
        )
      ) {

        stocks =
          window.TOP_20_STOCKS
            .map(normalizeStock)
            .filter(isValidStock);

      }


      if (!stocks.length) {

        stocks =
          getStocksFromMarketData()
            .map(normalizeStock)
            .filter(isValidStock);

      }


      if (!stocks.length) {

        return {

          success: false,

          message:
            "Pehle Connect Live Market Data karke live quotes load karein."

        };

      }


      stocks.sort(
        function (a, b) {

          return b.change - a.change;

        }
      );


      const selected =
        buildSmartPortfolio(
          stocks,
          amount
        );


      if (!selected.length) {

        return {

          success: false,

          message:
            "Current live prices ke basis par suitable whole-share allocation nahi ban paaya."

        };

      }


      const totalInvestment =
        selected.reduce(
          function (sum, stock) {

            return (
              sum +
              stock.investment
            );

          },
          0
        );


      const balance =
        amount -
        totalInvestment;


      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            selected,
            totalInvestment,
            balance
          ),

        message:
          `₹${formatMoney(amount)} ke liye smart diversified allocation calculate ki gayi hai.`,

        selectedStocks:
          selected,

        totalInvestment:
          totalInvestment,

        balance:
          balance

      };

    };


  // ==========================================
  // SMART PORTFOLIO
  // ==========================================

  function buildSmartPortfolio(
    stocks,
    amount
  ) {

    if (!stocks.length) {

      return [];

    }


    const affordable =
      stocks.filter(
        function (stock) {

          return stock.price <= amount;

        }
      );


    if (!affordable.length) {

      return [];

    }


    let targetCount;


    if (amount < 5000) {

      targetCount = 2;

    }

    else if (amount < 10000) {

      targetCount = 3;

    }

    else if (amount < 25000) {

      targetCount = 4;

    }

    else {

      targetCount =
        TARGET_STOCKS;

    }


    let maxPerStock =
      amount *
      MAX_STOCK_ALLOCATION;


    if (amount < 5000) {

      maxPerStock =
        amount * 0.50;

    }


    const candidates =
      affordable.map(
        function (stock, index) {

          let score =
            stock.change;


          score +=
            Math.max(
              0,
              20 - index
            ) * 0.02;


          if (
            stock.price >
            amount * 0.60
          ) {

            score -= 2;

          }


          return {

            ...stock,

            score:
              score

          };

        }
      );


    candidates.sort(
      function (a, b) {

        return b.score - a.score;

      }
    );


    const selected = [];

    const usedSectors =
      new Set();


    // ----------------------------------------
    // PASS 1 - DIVERSIFICATION
    // ----------------------------------------

    for (
      let i = 0;
      i < candidates.length &&
      selected.length < targetCount;
      i++
    ) {

      const stock =
        candidates[i];


      if (
        usedSectors.has(
          stock.sector
        )
      ) {

        continue;

      }


      const quantity =
        calculateQuantity(
          stock.price,
          amount,
          maxPerStock
        );


      if (quantity <= 0) {

        continue;

      }


      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          quantity *
          stock.price

      });


      usedSectors.add(
        stock.sector
      );

    }


    // ----------------------------------------
    // PASS 2 - FILL SLOTS
    // ----------------------------------------

    for (
      let i = 0;
      i < candidates.length &&
      selected.length < targetCount;
      i++
    ) {

      const stock =
        candidates[i];


      const alreadySelected =
        selected.some(
          function (item) {

            return (
              item.symbol ===
              stock.symbol
            );

          }
        );


      if (alreadySelected) {

        continue;

      }


      const currentTotal =
        selected.reduce(
          function (sum, item) {

            return (
              sum +
              item.investment
            );

          },
          0
        );


      const remaining =
        amount -
        currentTotal;


      if (remaining <= 0) {

        break;

      }


      const quantity =
        calculateQuantity(
          stock.price,
          remaining,
          Math.min(
            maxPerStock,
            remaining
          )
        );


      if (quantity <= 0) {

        continue;

      }


      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          quantity *
          stock.price

      });

    }


    // ----------------------------------------
    // USE REMAINING BALANCE
    // ----------------------------------------

    let total =
      selected.reduce(
        function (sum, item) {

          return (
            sum +
            item.investment
          );

        },
        0
      );


    let balance =
      amount -
      total;


    let improved = true;


    while (
      improved &&
      balance > 0
    ) {

      improved = false;


      const sortedSelected =
        [...selected].sort(
          function (a, b) {

            return b.score - a.score;

          }
        );


      for (
        let i = 0;
        i < sortedSelected.length;
        i++
      ) {

        const stock =
          sortedSelected[i];


        const maxInvestment =
          amount *
          MAX_STOCK_ALLOCATION;


        if (
          stock.investment +
          stock.price >
          maxInvestment
        ) {

          continue;

        }


        if (
          stock.price <=
          balance
        ) {

          stock.quantity += 1;

          stock.investment +=
            stock.price;

          total +=
            stock.price;

          balance -=
            stock.price;

          improved = true;

          break;

        }

      }

    }


    return selected;

  }


  // ==========================================
  // QUANTITY
  // ==========================================

  function calculateQuantity(
    price,
    available,
    maximumInvestment
  ) {

    if (
      !price ||
      price <= 0 ||
      available <= 0
    ) {

      return 0;

    }


    const allowed =
      Math.min(
        available,
        maximumInvestment
      );


    return Math.floor(
      allowed /
      price
    );

  }


  // ==========================================
  // RECOMMENDATION HTML
  // ==========================================

  function buildRecommendationHTML(
    amount,
    selected,
    totalInvestment,
    balance
  ) {

    let html = "";


    html +=
      `<div class="recommendation-plan">`;


    html +=
      `<strong>Investment Plan</strong>`;


    html +=
      `<br>Amount: ₹${formatMoney(amount)}`;


    html +=
      `<br>Selected Stocks: ${selected.length}`;


    html +=
      `<br>Estimated Investment: ₹${formatMoney(totalInvestment)}`;


    html +=
      `<br>Balance: ₹${formatMoney(balance)}`;


    html +=
      `</div>`;


    html +=
      `<div style="margin-top:14px;">`;


    selected.forEach(
      function (stock, index) {

        const changeClass =
          stock.change >= 0
            ? "positive"
            : "negative";


        html +=
          `<div style="
            padding:12px 0;
            border-bottom:1px solid #252d38;
          ">`;


        html +=
          `<strong>
            ${index + 1}. ${escapeHtml(stock.name)}
          </strong>`;


        html +=
          `<br>`;


        html +=
          `<span>${escapeHtml(stock.symbol)}</span>`;


        html +=
          `<br>`;


        html +=
          `<span>
            ${stock.quantity}
            share${stock.quantity > 1 ? "s" : ""}
          </span>`;


        html +=
          `<span
            style="margin-left:8px;"
            class="${changeClass}"
          >
            ${stock.change >= 0 ? "+" : ""}
            ${stock.change.toFixed(2)}%
          </span>`;


        html +=
          `<br>`;


        html +=
          `Price: ₹${formatMoney(stock.price)}`;


        html +=
          ` &nbsp; • &nbsp; `;


        html +=
          `Invest: ₹${formatMoney(stock.investment)}`;


        html +=
          `</div>`;

      }
    );


    html +=
      `</div>`;


    html +=
      `<p style="margin-top:14px;line-height:1.6;">`;


    html +=
      `₹${formatMoney(amount)} ke liye current live ranking ke basis par `;


    html +=
      `${selected.length} stock(s) mein diversified allocation calculate ki gayi hai. `;


    html +=
      `Total estimated investment ₹${formatMoney(totalInvestment)}. `;


    html +=
      `₹${formatMoney(balance)} balance bacha hai.`;


    html +=
      `<br>`;


    html +=
      `Ye calculation live market data, ranking aur prototype diversification rules par based hai. `;


    html +=
      `Investment ka final decision aapka hai.`;


    html +=
      `</p>`;


    return html;

  }


  // ==========================================
  // MONEY FORMAT
  // ==========================================

  function formatMoney(value) {

    return Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

  }


  // ==========================================
  // HTML ESCAPE
  // ==========================================

  function escapeHtml(value) {

    return String(
      value || ""
    )
      .replace(
        /&/g,
        "&amp;"
      )
      .replace(
        /</g,
        "&lt;"
      )
      .replace(
        />/g,
        "&gt;"
      )
      .replace(
        /"/g,
        "&quot;"
      )
      .replace(
        /'/g,
        "&#039;"
      );

  }


  console.log(
    "Prototype-1 app.js loaded successfully."
  );

})();
