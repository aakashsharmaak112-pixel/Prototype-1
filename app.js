// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + FAST SMART ALLOCATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  // ==========================================
  // CONFIG
  // ==========================================

  const MAX_STOCK_ALLOCATION = 0.35;

  let isConnecting = false;


  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

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

      if (
        !amountInput ||
        !totpInput ||
        !connectButton ||
        !analyzeButton ||
        !recommendation
      ) {

        console.error(
          "Required Prototype-1 elements not found."
        );

        return;
      }


      // ========================================
      // CONNECT LIVE MARKET DATA
      // ========================================

      connectButton.addEventListener(
        "click",
        async function () {

          if (isConnecting) {
            return;
          }

          const totp =
            String(
              totpInput.value || ""
            ).trim();

          hideError();


          // ------------------------------------
          // TOTP VALIDATION
          // ------------------------------------

          if (
            !/^\d{6}$/.test(totp)
          ) {

            showError(
              "Please current 6-digit Kotak Neo TOTP enter karein."
            );

            setMarketStatus(
              "WAITING",
              "status-pending"
            );

            return;
          }


          // ------------------------------------
          // CHECK MARKET ENGINE
          // ------------------------------------

          if (
            typeof window.fetchMarketData !==
            "function"
          ) {

            showError(
              "Market data engine load nahi hua. Page refresh karke dobara try karein."
            );

            return;
          }


          // ------------------------------------
          // CONNECTING STATE
          // ------------------------------------

          isConnecting = true;

          connectButton.disabled = true;

          analyzeButton.disabled = true;

          connectButton.textContent =
            "Connecting...";

          setMarketStatus(
            "CONNECTING...",
            "status-pending"
          );


          try {

            const success =
              await window.fetchMarketData(
                totp
              );


            if (!success) {

              const message =
                window.MARKET_DATA &&
                window.MARKET_DATA.error
                  ? window.MARKET_DATA.error
                  : "Live market data connect nahi ho paya.";

              showError(
                message
              );

              setMarketStatus(
                "ERROR",
                "status-error"
              );

              return;
            }


            const received =
              Number(
                window.MARKET_DATA.received || 0
              );


            const requested =
              Number(
                window.MARKET_DATA.requested ||
                50
              );


            setMarketStatus(
              `LIVE • ${received}/${requested}`,
              "status-ready"
            );


            renderTop20();


            recommendation.innerHTML =
              `Live market data connected successfully. ${received}/${requested} stocks received.`;


            console.log(
              `Live market data connected: ${received}/${requested}`
            );

          }

          catch (error) {

            console.error(
              "Connect error:",
              error
            );


            showError(
              error &&
              error.message
                ? error.message
                : "Live market data connect nahi ho paya."
            );


            setMarketStatus(
              "ERROR",
              "status-error"
            );

          }

          finally {

            isConnecting = false;

            connectButton.disabled =
              false;

            analyzeButton.disabled =
              false;

            connectButton.textContent =
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

          hideError();


          const amount =
            Number(
              amountInput.value
            );


          if (
            !Number.isFinite(amount) ||
            amount <= 0
          ) {

            recommendation.innerHTML =
              "Please valid investment amount enter karein.";

            return;
          }


          try {

            const result =
              window.analyzeInvestmentAmount(
                amount
              );


            if (
              result &&
              result.success
            ) {

              recommendation.innerHTML =
                result.html;

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

          }

        }
      );


      // ========================================
      // ENTER KEY SUPPORT
      // ========================================

      amountInput.addEventListener(
        "keydown",
        function (event) {

          if (
            event.key === "Enter"
          ) {

            analyzeButton.click();

          }

        }
      );


      totpInput.addEventListener(
        "keydown",
        function (event) {

          if (
            event.key === "Enter"
          ) {

            connectButton.click();

          }

        }
      );


      // ========================================
      // EXISTING DATA
      // ========================================

      if (
        window.MARKET_DATA &&
        window.MARKET_DATA.success
      ) {

        renderTop20();

      }

    }
  );


  // ==========================================
  // MAIN INVESTMENT FUNCTION
  // ==========================================

  window.analyzeInvestmentAmount =
    function (amount) {

      amount =
        Number(amount);


      if (
        !Number.isFinite(amount) ||
        amount <= 0
      ) {

        return {

          success: false,

          message:
            "Please valid investment amount enter karein."

        };

      }


      // ----------------------------------------
      // ONLY CURRENT LIVE MARKET DATA
      // ----------------------------------------

      let stocks =
        getStocksFromMarketData()
          .map(normalizeStock)
          .filter(isValidStock);


      if (!stocks.length) {

        return {

          success: false,

          message:
            "Pehle Connect Live Market Data karke live quotes load karein."

        };

      }


      // ----------------------------------------
      // LIVE RANKING
      // ----------------------------------------

      stocks.sort(
        function (a, b) {

          return b.change - a.change;

        }
      );


      // ----------------------------------------
      // ONLY TOP 20
      // ----------------------------------------

      stocks =
        stocks.slice(0, 20);


      // ----------------------------------------
      // BUILD PORTFOLIO
      // ----------------------------------------

      const selected =
        buildSmartPortfolio(
          stocks,
          amount
        );


      if (!selected.length) {

        return {

          success: false,

          message:
            "Current Top 20 ke andar is budget mein suitable whole-share allocation nahi ban paaya."

        };

      }


      // ----------------------------------------
      // TOTAL
      // ----------------------------------------

      let totalInvestment =
        0;


      selected.forEach(
        function (stock) {

          totalInvestment +=
            stock.investment;

        }
      );


      const balance =
        Math.max(
          0,
          amount - totalInvestment
        );


      // ----------------------------------------
      // RESULT
      // ----------------------------------------

      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            selected,
            totalInvestment,
            balance
          ),

        selectedStocks:
          selected,

        totalInvestment:
          totalInvestment,

        balance:
          balance

      };

    };


  // ==========================================
  // MARKET DATA
  // ==========================================

  function getStocksFromMarketData() {

    const market =
      window.MARKET_DATA;


    if (
      !market ||
      !market.stocks
    ) {

      return [];

    }


    // ----------------------------------------
    // ARRAY
    // ----------------------------------------

    if (
      Array.isArray(
        market.stocks
      )
    ) {

      return market.stocks;

    }


    // ----------------------------------------
    // OBJECT
    // ----------------------------------------

    if (
      typeof market.stocks !==
      "object"
    ) {

      return [];

    }


    const result =
      [];

    const keys =
      Object.keys(
        market.stocks
      );


    for (
      let i = 0;
      i < keys.length;
      i++
    ) {

      const key =
        keys[i];

      const item =
        market.stocks[key];


      if (!item) {
        continue;
      }


      result.push({

        symbol:
          item.symbol ||
          key,

        name:
          item.name ||
          item.displaySymbol ||
          key,

        sector:
          item.sector ||
          "",

        price:
          item.price ??
          item.ltp ??
          0,

        change:
          item.perChange ??
          item.change ??
          0

      });

    }


    return result;

  }


  // ==========================================
  // NORMALIZE
  // ==========================================

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


    const master =
      findNiftyStock(
        symbol
      );


    const name =
      String(
        stock.name ||
        stock.companyName ||
        (
          master &&
          master.name
        ) ||
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
        stock.perChange ??
        stock.change ??
        stock.percentChange ??
        0
      );


    const sector =
      String(
        stock.sector ||
        (
          master &&
          master.sector
        ) ||
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


  // ==========================================
  // FIND NIFTY STOCK
  // ==========================================

  function findNiftyStock(
    symbol
  ) {

    const list =
      Array.isArray(
        window.NIFTY_50_STOCKS
      )
        ? window.NIFTY_50_STOCKS
        : [];


    for (
      let i = 0;
      i < list.length;
      i++
    ) {

      if (
        String(
          list[i].symbol || ""
        ).toUpperCase() ===
        symbol
      ) {

        return list[i];

      }

    }


    return null;

  }


  // ==========================================
  // VALID STOCK
  // ==========================================

  function isValidStock(
    stock
  ) {

    return Boolean(

      stock &&

      stock.symbol &&

      Number.isFinite(
        stock.price
      ) &&

      stock.price > 0 &&

      Number.isFinite(
        stock.change
      )

    );

  }


  // ==========================================
  // TOP 20 RENDER
  // ==========================================

  function renderTop20() {

    const list =
      document.getElementById(
        "top20List"
      );


    if (!list) {
      return;
    }


    const stocks =
      getStocksFromMarketData()
        .map(normalizeStock)
        .filter(isValidStock)
        .sort(
          function (a, b) {

            return b.change - a.change;

          }
        )
        .slice(0, 20);


    if (!stocks.length) {

      list.innerHTML =
        '<p class="note">Live market data available nahi hai.</p>';

      return;

    }


    const fragment =
      document.createDocumentFragment();


    stocks.forEach(
      function (
        stock,
        index
      ) {

        const row =
          document.createElement(
            "div"
          );

        row.className =
          "stock";


        const left =
          document.createElement(
            "div"
          );

        left.className =
          "stock-left";


        const rank =
          document.createElement(
            "div"
          );

        rank.className =
          "rank";

        rank.textContent =
          String(
            index + 1
          );


        const info =
          document.createElement(
            "div"
          );


        const name =
          document.createElement(
            "div"
          );

        name.className =
          "stock-name";

        name.textContent =
          stock.name;


        const sector =
          document.createElement(
            "div"
          );

        sector.className =
          "stock-sector";

        sector.textContent =
          `${stock.symbol} • ${stock.sector}`;


        info.appendChild(
          name
        );

        info.appendChild(
          sector
        );


        left.appendChild(
          rank
        );

        left.appendChild(
          info
        );


        const right =
          document.createElement(
            "div"
          );

        right.className =
          "stock-change";


        const change =
          document.createElement(
            "div"
          );

        change.className =
          stock.change >= 0
            ? "positive"
            : "negative";


        change.textContent =
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;


        const price =
          document.createElement(
            "div"
          );

        price.textContent =
          `₹${formatMoney(stock.price)}`;


        right.appendChild(
          change
        );

        right.appendChild(
          price
        );


        row.appendChild(
          left
        );

        row.appendChild(
          right
        );


        fragment.appendChild(
          row
        );

      }
    );


    list.replaceChildren(
      fragment
    );

  }


  // ==========================================
  // SMART PORTFOLIO
  // ==========================================

  function buildSmartPortfolio(
    stocks,
    amount
  ) {

    if (
      !Array.isArray(stocks) ||
      !stocks.length
    ) {

      return [];

    }


    // ----------------------------------------
    // ONLY AFFORDABLE STOCKS
    // ----------------------------------------

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


    // ----------------------------------------
    // NUMBER OF STOCKS
    // ----------------------------------------

    let targetCount;


    if (
      amount < 5000
    ) {

      targetCount = 2;

    }

    else if (
      amount < 10000
    ) {

      targetCount = 3;

    }

    else if (
      amount < 20000
    ) {

      targetCount = 4;

    }

    else if (
      amount < 35000
    ) {

      targetCount = 5;

    }

    else if (
      amount < 50000
    ) {

      targetCount = 6;

    }

    else if (
      amount < 75000
    ) {

      targetCount = 7;

    }

    else {

      targetCount = 8;

    }


    targetCount =
      Math.min(
        targetCount,
        affordable.length
      );


    // ----------------------------------------
    // MAX PER STOCK
    // ----------------------------------------

    const maxPerStock =
      amount *
      MAX_STOCK_ALLOCATION;


    // ----------------------------------------
    // RANKED CANDIDATES
    // ----------------------------------------

    const candidates =
      affordable
        .map(
          function (
            stock,
            index
          ) {

            let score =
              stock.change;


            // Small ranking bonus
            score +=
              Math.max(
                0,
                20 - index
              ) * 0.02;


            // Avoid one very expensive
            // stock dominating the budget
            if (
              stock.price >
              amount * 0.45
            ) {

              score -=
                0.35;

            }


            return {

              ...stock,

              score:
                score

            };

          }
        )
        .sort(
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

    let total =
      0;


    // ========================================
    // PASS 1
    // DIFFERENT SECTORS
    // ========================================

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


      const remaining =
        amount -
        total;


      if (
        remaining <= 0
      ) {

        break;

      }


      const quantity =
        calculateQuantity(
          stock.price,
          remaining,
          maxPerStock
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      const investment =
        quantity *
        stock.price;


      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          investment

      });


      usedSectors.add(
        stock.sector
      );


      total +=
        investment;

    }


    // ========================================
    // PASS 2
    // FILL REMAINING SLOTS
    // ========================================

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


      if (
        alreadySelected
      ) {

        continue;

      }


      const remaining =
        amount -
        total;


      if (
        remaining <= 0
      ) {

        break;

      }


      const quantity =
        calculateQuantity(
          stock.price,
          remaining,
          maxPerStock
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      const investment =
        quantity *
        stock.price;


      selected.push({

        ...stock,

        quantity:
          quantity,

        investment:
          investment

      });


      total +=
        investment;

    }


    // ========================================
    // PASS 3
    // USE REMAINING BALANCE
    // ========================================

    let balance =
      amount -
      total;


    let improved =
      true;


    while (
      improved &&
      balance > 0
    ) {

      improved =
        false;


      const ordered =
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
        i < ordered.length;
        i++
      ) {

        const stock =
          ordered[i];


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


          total +=
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


  // ==========================================
  // QUANTITY
  // ==========================================

  function calculateQuantity(
    price,
    available,
    maximumInvestment
  ) {

    if (
      !Number.isFinite(price) ||
      price <= 0 ||
      !Number.isFinite(available) ||
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

    let html =
      "";


    html +=
      `<div class="investment-summary">`;


    html +=
      `<div class="investment-title">Investment Plan</div>`;


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
      `</div>`;


    selected.forEach(
      function (
        stock,
        index
      ) {

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
          `<strong>${index + 1}. ${escapeHtml(stock.name)}</strong>`;


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
          >`;


        html +=
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;


        html +=
          `</span>`;


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
      `<p style="margin-top:14px;line-height:1.6;">`;


    html +=
      `₹${formatMoney(amount)} ke liye Top 20 mein se budget ke andar ${selected.length} stock(s) mein diversified allocation calculate ki gayi hai.`;


    html +=
      ` Total estimated investment ₹${formatMoney(totalInvestment)}.`;


    html +=
      ` ₹${formatMoney(balance)} balance bacha hai.`;


    html +=
      `<br>`;


    html +=
      `Top 20 ranking, stock price aur diversification rules ko dhyan mein rakha gaya hai.`;


    html +=
      `<br>`;


    html +=
      `Total investment entered amount se zyada nahi ho sakta.`;


    html +=
      `<br>`;


    html +=
      `Ye calculation live market data aur prototype diversification rules par based hai.`;


    html +=
      ` Investment ka final decision aapka hai.`;


    html +=
      `</p>`;


    return html;

  }


  // ==========================================
  // STATUS
  // ==========================================

  function setMarketStatus(
    text,
    className
  ) {

    const marketStatus =
      document.getElementById(
        "marketStatus"
      );


    if (!marketStatus) {
      return;
    }


    marketStatus.textContent =
      text;


    marketStatus.className =
      className;

  }


  // ==========================================
  // ERROR
  // ==========================================

  function showError(
    message
  ) {

    const box =
      document.getElementById(
        "errorBox"
      );


    if (!box) {
      return;
    }


    box.textContent =
      String(
        message ||
        "Unknown error"
      );


    box.style.display =
      "block";

  }


  function hideError() {

    const box =
      document.getElementById(
        "errorBox"
      );


    if (!box) {
      return;
    }


    box.textContent =
      "";


    box.style.display =
      "none";

  }


  // ==========================================
  // MONEY FORMAT
  // ==========================================

  function formatMoney(
    value
  ) {

    return Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits:
          2,

        maximumFractionDigits:
          2

      }
    );

  }


  // ==========================================
  // HTML ESCAPE
  // ==========================================

  function escapeHtml(
    value
  ) {

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
