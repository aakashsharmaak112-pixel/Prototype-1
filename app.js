// ============================================
// PROTOTYPE-1
// APP.JS
// CONNECT LIVE DATA + TOP 20 + ANALYZE
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");


  // ==========================================
  // HELPERS
  // ==========================================

  function num(value) {

    const n = Number(value);

    return Number.isFinite(n)
      ? n
      : 0;

  }


  function money(value) {

    return num(value).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

  }


  function escapeHTML(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function normalizeStock(stock) {

    const item = stock || {};

    const rawSymbol = String(
      item.symbol ||
      item.tradingsymbol ||
      item.neoSymbol ||
      item.displaySymbol ||
      ""
    )
      .trim()
      .toUpperCase();

    const symbol =
      rawSymbol.replace(/-EQ$/i, "");

    const price = num(
      item.price ??
      item.ltp ??
      item.lastPrice ??
      item.close
    );

    const percentage = num(
      item.perChange ??
      item.percentChange ??
      item.pChange ??
      item.change
    );

    const rupeeChange = num(
      item.rupeeChange ??
      item.change
    );

    return {

      symbol: symbol,

      name: String(
        item.name ||
        item.companyName ||
        item.displaySymbol ||
        symbol
      )
        .replace(/-EQ$/i, "")
        .trim(),

      sector:
        item.sector ||
        "Nifty 50",

      price:
        price,

      perChange:
        percentage,

      change:
        percentage,

      rupeeChange:
        rupeeChange

    };

  }


  function validStock(stock) {

    return (
      stock &&
      stock.symbol &&
      stock.price > 0 &&
      Number.isFinite(stock.perChange)
    );

  }


  // ==========================================
  // GET CURRENT MARKET DATA
  // ==========================================

  function getLiveStocks() {

    const market =
      window.MARKET_DATA;

    const result = [];


    if (!market) {

      return result;

    }


    if (
      Array.isArray(
        market.stocks
      )
    ) {

      return market.stocks
        .map(normalizeStock)
        .filter(validStock);

    }


    if (
      market.stocks &&
      typeof market.stocks === "object"
    ) {

      Object.keys(
        market.stocks
      ).forEach(function (key) {

        const raw =
          market.stocks[key];

        const stock =
          normalizeStock({
            ...raw,
            symbol:
              raw?.symbol ||
              key
          });

        if (
          validStock(stock)
        ) {

          result.push(stock);

        }

      });

    }


    return result;

  }


  // ==========================================
  // TOP 20
  // ==========================================

  function buildTop20() {

    const stocks =
      getLiveStocks();


    stocks.sort(function (a, b) {

      return (
        b.perChange -
        a.perChange
      );

    });


    return stocks.slice(
      0,
      20
    );

  }


  function displayTop20(top20) {

    const list =
      document.getElementById(
        "top20List"
      );


    if (!list) {

      return;

    }


    if (!top20.length) {

      list.innerHTML =
        `
        <p class="note">
          Live market data received,
          but valid Nifty 50 prices were not matched.
        </p>
        `;

      return;

    }


    list.innerHTML =
      "";


    top20.forEach(
      function (stock, index) {

        const change =
          stock.perChange;


        const cls =
          change >= 0
            ? "positive"
            : "negative";


        const row =
          document.createElement(
            "div"
          );


        row.className =
          "stock";


        row.innerHTML = `

          <div class="stock-left">

            <div class="rank">
              ${index + 1}
            </div>

            <div>

              <div class="stock-name">
                ${escapeHTML(
                  stock.name
                )}
              </div>

              <div class="stock-sector">
                ${escapeHTML(
                  stock.symbol
                )}
                • Nifty 50
              </div>

            </div>

          </div>

          <div class="stock-change">

            <div class="${cls}">
              ${change >= 0 ? "+" : ""}
              ${change.toFixed(2)}%
            </div>

            <div class="stock-sector">
              ₹${money(stock.price)}
            </div>

          </div>

        `;


        list.appendChild(
          row
        );

      }
    );


    window.TOP_20_STOCKS =
      top20;


    const status =
      document.getElementById(
        "marketStatus"
      );


    if (status) {

      status.innerText =
        `LIVE • ${
          window.MARKET_DATA?.received ||
          top20.length
        }/50`;

      status.className =
        "status-ready";

    }

  }


  // ==========================================
  // CONNECT LIVE MARKET DATA
  // ==========================================

  async function connectLiveMarketData() {

    console.log(
      "Connect Live Market Data clicked."
    );


    const button =
      document.getElementById(
        "connectButton"
      );

    const totpInput =
      document.getElementById(
        "totp"
      );

    const list =
      document.getElementById(
        "top20List"
      );

    const status =
      document.getElementById(
        "marketStatus"
      );

    const errorBox =
      document.getElementById(
        "errorBox"
      );


    if (
      !button ||
      !totpInput ||
      !status ||
      !list
    ) {

      console.error(
        "Connect UI elements missing."
      );

      return;

    }


    if (errorBox) {

      errorBox.style.display =
        "none";

      errorBox.innerText =
        "";

    }


    const totp =
      String(
        totpInput.value || ""
      ).trim();


    // ----------------------------------------
    // TOTP
    // ----------------------------------------

    if (
      !/^\d{6}$/.test(totp)
    ) {

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


      if (errorBox) {

        errorBox.innerText =
          "Current 6-digit Kotak Neo TOTP enter karein.";

        errorBox.style.display =
          "block";

      }


      totpInput.focus();

      return;

    }


    // ----------------------------------------
    // MARKET DATA FUNCTION
    // ----------------------------------------

    if (
      typeof window.fetchMarketData !==
      "function"
    ) {

      status.innerText =
        "ENGINE ERROR";

      status.className =
        "status-error";


      if (errorBox) {

        errorBox.innerText =
          "market-data.js load nahi hua.";

        errorBox.style.display =
          "block";

      }


      console.error(
        "fetchMarketData() is missing."
      );

      return;

    }


    // ----------------------------------------
    // LOADING
    // ----------------------------------------

    button.disabled =
      true;

    button.innerText =
      "Connecting...";


    status.innerText =
      "LOADING";

    status.className =
      "status-pending";


    list.innerHTML =
      `
      <p class="note">
        Kotak Neo se live market data
        load ho raha hai...
      </p>
      `;


    try {

      const response =
        await window.fetchMarketData(
          totp
        );


      console.log(
        "fetchMarketData result:",
        response
      );


      const success =
        response === true ||
        (
          response &&
          response.success === true
        );


      if (!success) {

        throw new Error(
          "Kotak Neo live market data request failed."
        );

      }


      const stocks =
        getLiveStocks();


      console.log(
        "Live stocks mapped:",
        stocks.length
      );


      if (!stocks.length) {

        throw new Error(
          "API response mila, lekin valid stocks map nahi hue."
        );

      }


      // --------------------------------------
      // TOP 20
      // --------------------------------------

      const top20 =
        buildTop20();


      displayTop20(
        top20
      );


      console.log(
        "Top 20 ready:",
        top20
      );


    }

    catch (error) {

      console.error(
        "Connect error:",
        error
      );


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


      if (errorBox) {

        errorBox.innerText =
          error?.message ||
          "Unexpected connection error.";

        errorBox.style.display =
          "block";

      }

    }

    finally {

      button.disabled =
        false;

      button.innerText =
        "Connect Live Market Data";

    }

  }


  // ==========================================
  // SMART TARGET STOCK COUNT
  // ==========================================

  function getTargetCount(amount) {

    if (amount < 1000) return 1;
    if (amount < 3000) return 2;
    if (amount < 7500) return 3;
    if (amount < 15000) return 4;
    if (amount < 30000) return 5;

    return 6;

  }


  // ==========================================
  // MAX SINGLE STOCK %
  // ==========================================

  function getMaxAllocation(amount) {

    if (amount < 2000) return 0.70;
    if (amount < 5000) return 0.55;
    if (amount < 10000) return 0.45;
    if (amount < 25000) return 0.35;

    return 0.30;

  }


  // ==========================================
  // SMART PORTFOLIO
  // ==========================================

  function buildPortfolio(
    stocks,
    amount
  ) {

    const targetCount =
      getTargetCount(
        amount
      );


    const maxAllocation =
      getMaxAllocation(
        amount
      );


    const maxPerStock =
      amount *
      maxAllocation;


    const candidates =
      stocks
        .filter(function (stock) {

          return (
            stock.price <=
            amount
          );

        })
        .map(function (stock, index) {

          let score =
            stock.perChange;


          // Small ranking bonus

          score +=
            Math.max(
              0,
              20 - index
            ) * 0.05;


          // Prefer affordable prices

          if (
            stock.price <=
            amount * 0.30
          ) {

            score +=
              0.50;

          }


          // Penalize stock that
          // consumes too much budget

          if (
            stock.price >
            amount * 0.60
          ) {

            score -=
              1.50;

          }


          return {
            ...stock,
            score: score
          };

        })
        .sort(function (a, b) {

          return (
            b.score -
            a.score
          );

        });


    const selected = [];

    const symbols =
      new Set();

    const sectors =
      new Set();


    // ----------------------------------------
    // PASS 1: DIFFERENT SECTORS
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
        sectors.has(
          stock.sector
        )
      ) {

        continue;

      }


      const quantity =
        Math.floor(
          maxPerStock /
          stock.price
        );


      if (quantity <= 0) {

        continue;

      }


      const investment =
        quantity *
        stock.price;


      if (
        investment > amount
      ) {

        continue;

      }


      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          investment

      });


      symbols.add(
        stock.symbol
      );

      sectors.add(
        stock.sector
      );

    }


    // ----------------------------------------
    // PASS 2: FILL AVAILABLE SLOTS
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
        symbols.has(
          stock.symbol
        )
      ) {

        continue;

      }


      const used =
        selected.reduce(
          function (
            total,
            item
          ) {

            return (
              total +
              item.investment
            );

          },
          0
        );


      const remaining =
        amount -
        used;


      if (
        remaining <= 0
      ) {

        break;

      }


      const allowed =
        Math.min(
          remaining,
          maxPerStock
        );


      const quantity =
        Math.floor(
          allowed /
          stock.price
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      const investment =
        quantity *
        stock.price;


      if (
        used +
        investment >
        amount
      ) {

        continue;

      }


      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          investment

      });


      symbols.add(
        stock.symbol
      );

    }


    // ----------------------------------------
    // USE REMAINING BALANCE
    // ----------------------------------------

    let changed =
      true;


    while (changed) {

      changed =
        false;


      const total =
        selected.reduce(
          function (
            sum,
            item
          ) {

            return (
              sum +
              item.investment
            );

          },
          0
        );


      const balance =
        amount -
        total;


      if (
        balance <= 0
      ) {

        break;

      }


      const ranked =
        [...selected].sort(
          function (a, b) {

            return (
              b.score -
              a.score
            );

          }
        );


      for (
        let i = 0;
        i < ranked.length;
        i++
      ) {

        const stock =
          ranked[i];


        if (
          stock.investment +
          stock.price >
          maxPerStock
        ) {

          continue;

        }


        if (
          stock.price <=
          balance
        ) {

          stock.quantity +=
            1;

          stock.investment +=
            stock.price;

          changed =
            true;

          break;

        }

      }

    }


    return selected;

  }


  // ==========================================
  // ANALYZE INVESTMENT
  // ==========================================

  function analyzeInvestment() {

    const amountInput =
      document.getElementById(
        "amount"
      );

    const recommendation =
      document.getElementById(
        "recommendation"
      );


    if (
      !amountInput ||
      !recommendation
    ) {

      return;

    }


    const amount =
      num(
        amountInput.value
      );


    if (
      amount <= 0
    ) {

      recommendation.innerText =
        "Please valid investment amount enter karein.";

      return;

    }


    const stocks =
      buildTop20();


    if (
      !stocks.length
    ) {

      recommendation.innerText =
        "Pehle Connect Live Market Data karke live quotes load karein.";

      return;

    }


    const selected =
      buildPortfolio(
        stocks,
        amount
      );


    if (
      !selected.length
    ) {

      recommendation.innerText =
        "Is amount ke liye suitable whole-share allocation nahi ban paaya.";

      return;

    }


    const total =
      selected.reduce(
        function (
          sum,
          stock
        ) {

          return (
            sum +
            stock.investment
          );

        },
        0
      );


    const safeTotal =
      Math.min(
        amount,
        total
      );


    const balance =
      Math.max(
        0,
        amount -
        safeTotal
      );


    let html = "";


    html +=
      `<strong>Investment Plan</strong><br><br>`;


    html +=
      `Amount: ₹${money(amount)}<br>`;


    html +=
      `Selected Stocks: ${selected.length}<br>`;


    html +=
      `Estimated Investment: ₹${money(safeTotal)}<br>`;


    html +=
      `Balance: ₹${money(balance)}<br><br>`;


    selected.forEach(
      function (
        stock,
        index
      ) {

        const cls =
          stock.perChange >= 0
            ? "positive"
            : "negative";


        html +=
          `
          <div style="
            padding:12px 0;
            border-bottom:1px solid #252d38;
          ">

            <strong>
              ${index + 1}.
              ${escapeHTML(
                stock.name
              )}
            </strong>

            <br>

            ${escapeHTML(
              stock.symbol
            )}

            <br>

            ${stock.quantity}
            share${stock.quantity > 1 ? "s" : ""}

            <span
              class="${cls}"
              style="margin-left:8px;"
            >
              ${stock.perChange >= 0 ? "+" : ""}
              ${stock.perChange.toFixed(2)}%
            </span>

            <br>

            Price:
            ₹${money(
              stock.price
            )}

            &nbsp; • &nbsp;

            Invest:
            ₹${money(
              stock.investment
            )}

          </div>
          `;

      }
    );


    html +=
      `
      <p style="
        margin-top:14px;
        line-height:1.6;
      ">

        ₹${money(amount)}
        ke liye current live ranking ke basis par
        ${selected.length}
        stock(s) mein budget-safe diversified
        allocation calculate ki gayi hai.

        <br>

        Total estimated investment
        ₹${money(safeTotal)}.

        <br>

        ₹${money(balance)}
        balance bacha hai.

        <br>

        Total investment entered amount se
        zyada nahi ho sakta.

        <br><br>

        Ye calculation live market data aur
        prototype diversification rules par based hai.
        Investment ka final decision aapka hai.

      </p>
      `;


    recommendation.innerHTML =
      html;

  }


  // ==========================================
  // START
  // ==========================================

  function initialize() {

    console.log(
      "Prototype-1 initializing..."
    );


    const connectButton =
      document.getElementById(
        "connectButton"
      );


    const analyzeButton =
      document.getElementById(
        "analyzeButton"
      );


    const stockCount =
      document.getElementById(
        "stockCount"
      );


    // ----------------------------------------
    // STOCK COUNT
    // ----------------------------------------

    if (
      stockCount &&
      Array.isArray(
        window.NIFTY_50_STOCKS
      )
    ) {

      stockCount.innerText =
        window.NIFTY_50_STOCKS.length;

    }


    // ----------------------------------------
    // CONNECT BUTTON
    // ----------------------------------------

    if (connectButton) {

      connectButton.addEventListener(
        "click",
        connectLiveMarketData
      );

    } else {

      console.error(
        "connectButton not found in HTML."
      );

    }


    // ----------------------------------------
    // ANALYZE BUTTON
    // ----------------------------------------

    if (analyzeButton) {

      analyzeButton.addEventListener(
        "click",
        analyzeInvestment
      );

    } else {

      console.error(
        "analyzeButton not found in HTML."
      );

    }


    console.log(
      "Prototype-1 buttons connected."
    );

  }


  // ==========================================
  // GLOBAL FUNCTIONS
  // ==========================================

  window.connectLiveMarketData =
    connectLiveMarketData;

  window.analyzeInvestment =
    analyzeInvestment;

  window.buildTop20 =
    buildTop20;

  window.displayTop20 =
    displayTop20;


  // ==========================================
  // BOOT
  // ==========================================

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initialize,
      {
        once: true
      }
    );

  } else {

    initialize();

  }


  console.log(
    "Prototype-1 app.js loaded."
  );

})();
