// ============================================
// PROTOTYPE-1
// app.js
// LIVE MARKET DATA + TOP 20 + SMART ALLOCATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");


  // ============================================
  // CONFIG
  // ============================================

  const MAX_STOCKS =
    5;

  const MAX_STOCK_ALLOCATION =
    0.35;


  // ============================================
  // DOM HELPERS
  // ============================================

  function getElement(id) {
    return document.getElementById(id);
  }


  function setStatus(text, type) {

    const element =
      getElement("marketStatus");

    if (!element) {
      return;
    }

    element.innerText =
      text;

    if (type === "ready") {

      element.className =
        "status-ready";

    } else if (type === "error") {

      element.className =
        "status-error";

    } else {

      element.className =
        "status-pending";

    }

  }


  function showError(message) {

    const box =
      getElement("errorBox");

    if (!box) {
      return;
    }

    box.innerText =
      message || "Unknown error.";

    box.style.display =
      "block";

  }


  function clearError() {

    const box =
      getElement("errorBox");

    if (!box) {
      return;
    }

    box.innerText =
      "";

    box.style.display =
      "none";

  }


  // ============================================
  // NUMBER
  // ============================================

  function toNumber(value) {

    const number =
      Number(value);

    return Number.isFinite(number)
      ? number
      : 0;

  }


  // ============================================
  // MONEY
  // ============================================

  function formatMoney(value) {

    return toNumber(value).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

  }


  // ============================================
  // HTML ESCAPE
  // ============================================

  function escapeHtml(value) {

    return String(
      value ?? ""
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


  // ============================================
  // NORMALIZE STOCK
  // ============================================

  function normalizeStock(stock) {

    const item =
      stock || {};


    const symbol =
      String(
        item.symbol ||
        item.tradingsymbol ||
        item.neoSymbol ||
        item.displaySymbol ||
        ""
      )
        .replace(
          /-EQ$/i,
          ""
        )
        .trim()
        .toUpperCase();


    const price =
      toNumber(
        item.price ??
        item.ltp ??
        item.lastPrice ??
        item.close
      );


    /*
      IMPORTANT:

      Kotak Neo:
      change    = rupee change
      perChange = percentage change

      For ranking/display we use perChange.
    */

    const perChange =
      toNumber(
        item.perChange ??
        item.percentChange ??
        item.pChange ??
        0
      );


    const rupeeChange =
      toNumber(
        item.rupeeChange ??
        item.change ??
        0
      );


    return {

      symbol:
        symbol,

      name:
        String(
          item.name ||
          item.companyName ||
          item.displaySymbol ||
          symbol
        ).trim(),

      sector:
        String(
          item.sector ||
          "Nifty 50"
        ),

      price:
        price,

      perChange:
        perChange,

      change:
        perChange,

      rupeeChange:
        rupeeChange

    };

  }


  // ============================================
  // VALID STOCK
  // ============================================

  function isValidStock(stock) {

    return (
      stock &&
      stock.symbol &&
      stock.price > 0 &&
      Number.isFinite(
        stock.perChange
      )
    );

  }


  // ============================================
  // GET MARKET STOCKS
  // ============================================

  function getMarketStocks() {

    const result =
      [];

    const market =
      window.MARKET_DATA;


    if (!market) {
      return result;
    }


    // ------------------------------------------
    // ARRAY FORMAT
    // ------------------------------------------

    if (
      Array.isArray(
        market.stocks
      )
    ) {

      return market.stocks
        .map(
          normalizeStock
        )
        .filter(
          isValidStock
        );

    }


    // ------------------------------------------
    // OBJECT FORMAT
    // ------------------------------------------

    if (
      market.stocks &&
      typeof market.stocks === "object"
    ) {

      Object.keys(
        market.stocks
      ).forEach(
        function (key) {

          const raw =
            market.stocks[key];


          const stock =
            normalizeStock(
              {
                ...raw,
                symbol:
                  raw?.symbol ||
                  key
              }
            );


          if (
            isValidStock(
              stock
            )
          ) {

            result.push(
              stock
            );

          }

        }
      );

    }


    return result;

  }


  // ============================================
  // GET CURRENT LIVE TOP 20
  // ============================================

  function buildTop20() {

    let stocks =
      getMarketStocks();


    /*
      If market-data.js has already created
      TOP_20_STOCKS, use live data from there
      only when valid.
    */

    if (
      Array.isArray(
        window.TOP_20_STOCKS
      ) &&
      window.TOP_20_STOCKS.length > 0
    ) {

      const topStocks =
        window.TOP_20_STOCKS
          .map(
            normalizeStock
          )
          .filter(
            isValidStock
          );


      if (
        topStocks.length > 0
      ) {

        stocks =
          topStocks;

      }

    }


    if (!stocks.length) {

      return [];

    }


    // ------------------------------------------
    // REMOVE DUPLICATES
    // ------------------------------------------

    const map =
      new Map();


    stocks.forEach(
      function (stock) {

        if (
          !map.has(
            stock.symbol
          )
        ) {

          map.set(
            stock.symbol,
            stock
          );

        }

      }
    );


    stocks =
      Array.from(
        map.values()
      );


    // ------------------------------------------
    // SORT BY PERCENTAGE CHANGE
    // ------------------------------------------

    stocks.sort(
      function (a, b) {

        return (
          b.perChange -
          a.perChange
        );

      }
    );


    return stocks.slice(
      0,
      20
    );

  }


  // ============================================
  // DISPLAY TOP 20
  // ============================================

  function displayTop20(
    stocks
  ) {

    const list =
      getElement(
        "top20List"
      );


    if (!list) {
      return;
    }


    if (
      !Array.isArray(stocks) ||
      stocks.length === 0
    ) {

      list.innerHTML =
        `
        <p class="note">
          Live market data available hai,
          lekin valid Nifty 50 prices match nahi hue.
        </p>
        `;

      setStatus(
        "NO DATA",
        "error"
      );

      return;

    }


    list.innerHTML =
      "";


    stocks.forEach(
      function (
        stock,
        index
      ) {

        const change =
          stock.perChange;


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


        const row =
          document.createElement(
            "div"
          );


        row.className =
          "stock";


        row.innerHTML =
          `
          <div class="stock-left">

            <div class="rank">
              ${index + 1}
            </div>

            <div>

              <div class="stock-name">
                ${escapeHtml(
                  stock.name ||
                  stock.symbol
                )}
              </div>

              <div class="stock-sector">
                ${escapeHtml(
                  stock.symbol
                )}
                •
                ${escapeHtml(
                  stock.sector
                )}
              </div>

            </div>

          </div>


          <div class="stock-change">

            <div class="${changeClass}">
              ${changeText}
            </div>

            <div class="stock-sector">
              ₹${formatMoney(
                stock.price
              )}
            </div>

          </div>
          `;


        list.appendChild(
          row
        );

      }
    );


    /*
      Save normalized Top 20.
    */

    window.TOP_20_STOCKS =
      stocks.map(
        function (stock) {

          return {

            symbol:
              stock.symbol,

            name:
              stock.name,

            sector:
              stock.sector,

            price:
              stock.price,

            perChange:
              stock.perChange,

            change:
              stock.perChange,

            rupeeChange:
              stock.rupeeChange

          };

        }
      );


    setStatus(
      "LIVE • " +
      (
        window.MARKET_DATA?.received ||
        50
      ) +
      "/50",
      "ready"
    );


    console.log(
      "Prototype-1 Top 20:",
      window.TOP_20_STOCKS
    );

  }


  // ============================================
  // CONNECT LIVE MARKET DATA
  // ============================================

  async function connectLiveMarketData() {

    console.log(
      "Connect Live Market Data clicked."
    );


    clearError();


    const button =
      getElement(
        "connectButton"
      );


    const totpInput =
      getElement(
        "totp"
      );


    const list =
      getElement(
        "top20List"
      );


    const totp =
      String(
        totpInput?.value ||
        ""
      ).trim();


    // ------------------------------------------
    // TOTP
    // ------------------------------------------

    if (
      !/^\d{6}$/.test(
        totp
      )
    ) {

      setStatus(
        "TOTP REQUIRED",
        "pending"
      );


      if (list) {

        list.innerHTML =
          `
          <p class="note">
            Current 6-digit TOTP enter karein.
          </p>
          `;

      }


      showError(
        "Current 6-digit Kotak Neo TOTP enter karein."
      );


      totpInput?.focus();

      return;

    }


    // ------------------------------------------
    // MARKET DATA FUNCTION
    // ------------------------------------------

    if (
      typeof window.fetchMarketData !==
      "function"
    ) {

      console.error(
        "fetchMarketData() not found."
      );


      setStatus(
        "ENGINE ERROR",
        "error"
      );


      showError(
        "market-data.js load nahi hua."
      );


      return;

    }


    // ------------------------------------------
    // LOADING
    // ------------------------------------------

    if (button) {

      button.disabled =
        true;

      button.innerText =
        "Connecting...";

    }


    setStatus(
      "LOADING",
      "pending"
    );


    if (list) {

      list.innerHTML =
        `
        <p class="note">
          Kotak Neo se live market data
          load ho raha hai...
        </p>
        `;

    }


    try {

      const result =
        await window.fetchMarketData(
          totp
        );


      console.log(
        "fetchMarketData result:",
        result
      );


      /*
        market-data.js currently returns
        true / false.
      */

      const success =
        result === true ||
        (
          result &&
          result.success === true
        );


      if (!success) {

        throw new Error(
          "Kotak Neo live market data request failed."
        );

      }


      // ----------------------------------------
      // VERIFY DATA
      // ----------------------------------------

      const stocks =
        getMarketStocks();


      console.log(
        "Normalized live stock count:",
        stocks.length
      );


      if (
        stocks.length === 0
      ) {

        throw new Error(
          "API response mila, lekin frontend mein valid stocks map nahi hue."
        );

      }


      // ----------------------------------------
      // BUILD TOP 20
      // ----------------------------------------

      const top20 =
        stocks
          .sort(
            function (a, b) {

              return (
                b.perChange -
                a.perChange
              );

            }
          )
          .slice(
            0,
            20
          );


      displayTop20(
        top20
      );


    }

    catch (error) {

      console.error(
        "Market connection error:",
        error
      );


      setStatus(
        "ERROR",
        "error"
      );


      if (list) {

        list.innerHTML =
          `
          <p class="note">
            Kotak Neo live quotes request failed.
          </p>
          `;

      }


      showError(
        error?.message ||
        "Unexpected market connection error."
      );

    }

    finally {

      if (button) {

        button.disabled =
          false;

        button.innerText =
          "Connect Live Market Data";

      }

    }

  }


  // ============================================
  // SMART INVESTMENT PORTFOLIO
  // ============================================

  function buildSmartPortfolio(
    stocks,
    amount
  ) {

    if (
      !Array.isArray(stocks) ||
      stocks.length === 0
    ) {

      return [];

    }


    const affordable =
      stocks.filter(
        function (stock) {

          return (
            stock.price <=
            amount
          );

        }
      );


    if (!affordable.length) {

      return [];

    }


    let targetCount;


    if (amount < 5000) {

      targetCount = 2;

    } else if (amount < 10000) {

      targetCount = 3;

    } else if (amount < 25000) {

      targetCount = 4;

    } else {

      targetCount =
        MAX_STOCKS;

    }


    /*
      For diversification:
      no single stock gets more than
      35% of the total amount.
    */

    let maxPerStock =
      amount *
      MAX_STOCK_ALLOCATION;


    /*
      For very small amounts, allow
      50% maximum because whole-share
      prices can make diversification
      impossible.
    */

    if (
      amount < 5000
    ) {

      maxPerStock =
        amount * 0.50;

    }


    const candidates =
      affordable.map(
        function (
          stock,
          index
        ) {

          let score =
            stock.perChange;


          /*
            Small ranking bonus.
          */

          score +=
            Math.max(
              0,
              20 - index
            ) * 0.02;


          /*
            Penalize a stock that would
            consume most of the portfolio.
          */

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

        return (
          b.score -
          a.score
        );

      }
    );


    const selected =
      [];


    const usedSectors =
      new Set();


    // ------------------------------------------
    // PASS 1
    // DIFFERENT SECTORS
    // ------------------------------------------

    for (
      let i = 0;

      i <
      candidates.length &&
      selected.length <
      targetCount;

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


      if (
        quantity <= 0
      ) {

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


    // ------------------------------------------
    // PASS 2
    // FILL REMAINING SLOTS
    // ------------------------------------------

    for (
      let i = 0;

      i <
      candidates.length &&
      selected.length <
      targetCount;

      i++
    ) {

      const stock =
        candidates[i];


      const already =
        selected.some(
          function (item) {

            return (
              item.symbol ===
              stock.symbol
            );

          }
        );


      if (already) {

        continue;

      }


      const currentTotal =
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


      const remaining =
        amount -
        currentTotal;


      if (
        remaining <= 0
      ) {

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


      if (
        quantity <= 0
      ) {

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


    // ------------------------------------------
    // USE REMAINING BALANCE
    // ------------------------------------------

    let totalInvestment =
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


    let balance =
      amount -
      totalInvestment;


    let improved =
      true;


    while (
      improved &&
      balance > 0
    ) {

      improved =
        false;


      const sorted =
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

        i <
        sorted.length;

        i++
      ) {

        const stock =
          sorted[i];


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

          stock.quantity +=
            1;

          stock.investment +=
            stock.price;

          totalInvestment +=
            stock.price;

          balance -=
            stock.price;

          improved =
            true;

          break;

        }

      }

    }


    return selected;

  }


  // ============================================
  // QUANTITY
  // ============================================

  function calculateQuantity(
    price,
    available,
    maximumInvestment
  ) {

    if (
      price <= 0 ||
      available <= 0 ||
      maximumInvestment <= 0
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


  // ============================================
  // ANALYZE INVESTMENT
  // ============================================

  function analyzeInvestmentAmount(
    amount
  ) {

    const investmentAmount =
      toNumber(amount);


    if (
      investmentAmount <= 0
    ) {

      return {

        success: false,

        message:
          "Please valid investment amount enter karein."

      };

    }


    let stocks =
      Array.isArray(
        window.TOP_20_STOCKS
      )
        ? window.TOP_20_STOCKS
            .map(
              normalizeStock
            )
            .filter(
              isValidStock
            )
        : [];


    if (
      stocks.length === 0
    ) {

      stocks =
        getMarketStocks();

    }


    if (
      stocks.length === 0
    ) {

      return {

        success: false,

        message:
          "Pehle Connect Live Market Data karke live quotes load karein."

      };

    }


    stocks.sort(
      function (a, b) {

        return (
          b.perChange -
          a.perChange
        );

      }
    );


    const selected =
      buildSmartPortfolio(
        stocks,
        investmentAmount
      );


    if (
      selected.length === 0
    ) {

      return {

        success: false,

        message:
          "Current live prices ke basis par suitable whole-share allocation nahi ban paaya."

      };

    }


    const totalInvestment =
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


    /*
      Safety:
      never allow negative balance.
    */

    const safeTotal =
      Math.min(
        investmentAmount,
        totalInvestment
      );


    const balance =
      Math.max(
        0,
        investmentAmount -
        safeTotal
      );


    return {

      success: true,

      html:
        buildRecommendationHTML(
          investmentAmount,
          selected,
          safeTotal,
          balance
        ),

      message:
        `₹${formatMoney(investmentAmount)} ke liye smart diversified allocation calculate ki gayi hai.`,

      selectedStocks:
        selected,

      totalInvestment:
        safeTotal,

      balance:
        balance

    };

  }


  // ============================================
  // RECOMMENDATION HTML
  // ============================================

  function buildRecommendationHTML(
    amount,
    selected,
    totalInvestment,
    balance
  ) {

    let html =
      "";


    html +=
      `<strong>Investment Plan</strong>`;


    html +=
      `<br><br>`;


    html +=
      `Amount: ₹${formatMoney(amount)}`;


    html +=
      `<br>`;


    html +=
      `Selected Stocks: ${selected.length}`;


    html +=
      `<br>`;


    html +=
      `Estimated Investment: ₹${formatMoney(totalInvestment)}`;


    html +=
      `<br>`;


    html +=
      `Balance: ₹${formatMoney(balance)}`;


    html +=
      `<br><br>`;


    selected.forEach(
      function (
        stock,
        index
      ) {

        const change =
          stock.perChange;


        const changeClass =
          change >= 0
            ? "positive"
            : "negative";


        html +=
          `<div style="
            padding:12px 0;
            border-bottom:1px solid #252d38;
          ">`;


        html +=
          `<strong>
            ${index + 1}.
            ${escapeHtml(
              stock.name
            )}
          </strong>`;


        html +=
          `<br>`;


        html +=
          `<span>
            ${escapeHtml(
              stock.symbol
            )}
          </span>`;


        html +=
          `<br>`;


        html +=
          `${stock.quantity}
           share${stock.quantity > 1 ? "s" : ""}`;


        html +=
          `<span
            style="margin-left:8px;"
            class="${changeClass}"
          >
            ${change >= 0 ? "+" : ""}
            ${change.toFixed(2)}%
          </span>`;


        html +=
          `<br>`;


        html +=
          `Price:
           ₹${formatMoney(
             stock.price
           )}`;


        html +=
          ` &nbsp; • &nbsp; `;


        html +=
          `Invest:
           ₹${formatMoney(
             stock.investment
           )}`;


        html +=
          `</div>`;

      }
    );


    html +=
      `<p
        style="
          margin-top:14px;
          line-height:1.6;
        "
      >`;


    html +=
      `₹${formatMoney(
        amount
      )}
      ke liye current live ranking ke basis par
      ${selected.length}
      stock(s) mein diversified allocation
      calculate ki gayi hai.`;


    html +=
      `<br>`;


    html +=
      `Total estimated investment
      ₹${formatMoney(
        totalInvestment
      )}.`;


    html +=
      `<br>`;


    html +=
      `₹${formatMoney(
        balance
      )}
      balance bacha hai.`;


    html +=
      `<br><br>`;


    html +=
      `Ye calculation live market data,
      ranking aur prototype diversification
      rules par based hai.
      Investment ka final decision aapka hai.`;


    html +=
      `</p>`;


    return html;

  }


  // ============================================
  // INITIALIZE
  // ============================================

  function initializeApp() {

    console.log(
      "Prototype-1 initializing..."
    );


    const connectButton =
      getElement(
        "connectButton"
      );


    const analyzeButton =
      getElement(
        "analyzeButton"
      );


    const stockCount =
      getElement(
        "stockCount"
      );


    if (
      stockCount &&
      Array.isArray(
        window.NIFTY_50_STOCKS
      )
    ) {

      stockCount.innerText =
        window.NIFTY_50_STOCKS.length;

    }


    // ------------------------------------------
    // CONNECT BUTTON
    // ------------------------------------------

    if (connectButton) {

      connectButton.addEventListener(
        "click",
        connectLiveMarketData
      );

    } else {

      console.error(
        "connectButton not found."
      );

    }


    // ------------------------------------------
    // ANALYZE BUTTON
    // ------------------------------------------

    if (analyzeButton) {

      analyzeButton.addEventListener(
        "click",
        function () {

          const amountInput =
            getElement(
              "amount"
            );


          const recommendation =
            getElement(
              "recommendation"
            );


          const amount =
            toNumber(
              amountInput?.value
            );


          if (
            amount <= 0
          ) {

            if (recommendation) {

              recommendation.innerText =
                "Please valid investment amount enter karein.";

            }

            return;

          }


          try {

            const result =
              analyzeInvestmentAmount(
                amount
              );


            if (
              result.success
            ) {

              recommendation.innerHTML =
                result.html;

            } else {

              recommendation.innerHTML =
                escapeHtml(
                  result.message
                );

            }

          }

          catch (error) {

            console.error(
              "Analyze error:",
              error
            );


            if (recommendation) {

              recommendation.innerText =
                "Investment analysis mein error aaya: " +
                (
                  error?.message ||
                  "Unknown error"
                );

            }

          }

        }
      );

    }


    console.log(
      "Prototype-1 ready."
    );

  }


  // ============================================
  // EXPORT
  // ============================================

  window.analyzeInvestmentAmount =
    analyzeInvestmentAmount;

  window.buildTop20 =
    buildTop20;

  window.displayTop20 =
    displayTop20;

  window.connectLiveMarketData =
    connectLiveMarketData;


  // ============================================
  // START
  // ============================================

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      initializeApp
    );

  } else {

    initializeApp();

  }


})();
