// ============================================
// PROTOTYPE-1
// APP ENGINE
// NIFTY WEIGHT BASED TOP-20 ALLOCATION
// MAX 1 SHARE / COMPANY
// LIVE MARKET DATA PRESERVED
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  let isConnecting = false;

  // ==========================================
  // CURRENT NIFTY 50 WEIGHTS
  // Verified against current constituent-weight
  // data available in Aug 2026.
  // ==========================================

  const NIFTY_WEIGHTS = {

    RELIANCE: 9.05,
    BHARTIARTL: 6.35,
    HDFCBANK: 5.73,
    ICICIBANK: 5.20,
    SBIN: 5.04,
    TCS: 4.36,
    BAJFINANCE: 3.46,
    LT: 2.86,
    HINDUNILVR: 2.51,
    INFY: 2.42,
    SUNPHARMA: 2.36,
    TITAN: 2.30,
    MARUTI: 2.23,
    M_M: 2.19,
    ADANIENT: 2.10,
    KOTAKBANK: 2.00,
    ADANIPORTS: 2.00,
    AXISBANK: 1.94,
    HCLTECH: 1.89,
    ITC: 1.78,
    ULTRACEMCO: 1.76,
    NTPC: 1.69,
    BAJAJFINSV: 1.66,
    BAJAJ_AUTO: 1.64,
    JSWSTEEL: 1.58,
    ETERNAL: 1.57,
    BEL: 1.53,
    ONGC: 1.52,
    SHRIRAMFIN: 1.35,
    ASIANPAINT: 1.33,
    COALINDIA: 1.29,
    POWERGRID: 1.27,
    HINDALCO: 1.19,
    TATASTEEL: 1.17,
    EICHERMOT: 1.14,
    GRASIM: 1.13,
    INDIGO: 1.05,
    WIPRO: 0.93,
    SBILIFE: 0.93,
    JIOFIN: 0.84,
    TECHM: 0.82,
    TRENT: 0.81,
    APOLLOHOSP: 0.66,
    TATAMOTORS: 0.63,
    CIPLA: 0.60,
    HDFCLIFE: 0.60,
    TATACONSUM: 0.55,
    DRREDDY: 0.51,
    MAXHEALTH: 0.50

  };


  // ==========================================
  // SYMBOL ALIASES
  // ==========================================

  const WEIGHT_ALIASES = {

    "M&M": "M_M",
    "M&M-EQ": "M_M",

    "BAJAJ-AUTO": "BAJAJ_AUTO",

    "HCL-TECH": "HCLTECH",

    "HDFC-LIFE": "HDFCLIFE",

    "DRREDDY": "DRREDDY",

    "NIFTY50": "NIFTY50"

  };


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


          if (
            typeof window.fetchMarketData !==
            "function"
          ) {

            showError(
              "Market data engine load nahi hua. Page refresh karke dobara try karein."
            );

            return;

          }


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

              showError(message);

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
                window.MARKET_DATA.requested || 50
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
      // ANALYZE
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
      // ENTER KEY
      // ========================================

      amountInput.addEventListener(
        "keydown",
        function (event) {

          if (event.key === "Enter") {

            analyzeButton.click();

          }

        }
      );


      totpInput.addEventListener(
        "keydown",
        function (event) {

          if (event.key === "Enter") {

            connectButton.click();

          }

        }
      );


      // ========================================
      // EXISTING LIVE DATA
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
  // MAIN ANALYSIS
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
      // RANK BY LIVE CHANGE
      // ----------------------------------------

      stocks.sort(
        function (a, b) {

          return b.change - a.change;

        }
      );


      // ----------------------------------------
      // CURRENT TOP 20
      // ----------------------------------------

      const top20 =
        stocks.slice(0, 20);


      // ----------------------------------------
      // ADD NIFTY WEIGHT
      // ----------------------------------------

      top20.forEach(
        function (stock) {

          stock.niftyWeight =
            getNiftyWeight(
              stock.symbol
            );

        }
      );


      // ----------------------------------------
      // CHECK WEIGHTS
      // ----------------------------------------

      const missingWeights =
        top20.filter(
          function (stock) {

            return (
              !Number.isFinite(
                stock.niftyWeight
              ) ||
              stock.niftyWeight <= 0
            );

          }
        );


      if (missingWeights.length) {

        return {

          success: false,

          message:
            "Top 20 ke kuch stocks ke Nifty weights available nahi hain: " +
            missingWeights
              .map(
                function (stock) {
                  return stock.symbol;
                }
              )
              .join(", ")

        };

      }


      // ----------------------------------------
      // NORMALIZED TOP-20 WEIGHTS
      // ----------------------------------------

      const totalTop20Weight =
        top20.reduce(
          function (sum, stock) {

            return (
              sum +
              stock.niftyWeight
            );

          },
          0
        );


      top20.forEach(
        function (stock) {

          stock.normalizedWeight =
            (
              stock.niftyWeight /
              totalTop20Weight
            ) *
            100;


          stock.targetAmount =
            amount *
            (
              stock.niftyWeight /
              totalTop20Weight
            );

        }
      );


      // ----------------------------------------
      // 1 SHARE EACH REQUIRED
      // ----------------------------------------

      const oneShareRequired =
        top20.reduce(
          function (sum, stock) {

            return (
              sum +
              stock.price
            );

          },
          0
        );


      // ----------------------------------------
      // BUILD BUDGET PLAN
      // MAX 1 SHARE / COMPANY
      // ----------------------------------------

      const selected =
        buildBudgetPlan(
          top20,
          amount
        );


      const actualInvestment =
        selected.reduce(
          function (sum, stock) {

            return (
              sum +
              stock.investment
            );

          },
          0
        );


      const remaining =
        Math.max(
          0,
          amount -
          actualInvestment
        );


      const coverage =
        selected.length;


      const shortfall =
        Math.max(
          0,
          oneShareRequired -
          amount
        );


      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            top20,
            selected,
            totalTop20Weight,
            oneShareRequired,
            actualInvestment,
            remaining,
            shortfall,
            coverage
          ),

        selectedStocks:
          selected,

        top20:
          top20,

        totalInvestment:
          actualInvestment,

        balance:
          remaining,

        requiredForAll:
          oneShareRequired,

        shortfall:
          shortfall

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


    if (
      Array.isArray(
        market.stocks
      )
    ) {

      return market.stocks;

    }


    if (
      typeof market.stocks !==
      "object"
    ) {

      return [];

    }


    const result =
      [];


    Object.keys(
      market.stocks
    ).forEach(
      function (key) {

        const item =
          market.stocks[key];


        if (!item) {
          return;
        }


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
            "",

          price:
            item.price ??
            item.ltp ??
            item.lastPrice ??
            0,

          change:
            item.perChange ??
            item.change ??
            item.percentChange ??
            0

        });

      }
    );


    return result;

  }


  // ==========================================
  // NORMALIZE STOCK
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

      const item =
        list[i];


      const itemSymbol =
        String(
          item.symbol || ""
        )
          .replace(
            /-EQ$/i,
            ""
          )
          .toUpperCase();


      if (
        itemSymbol ===
        symbol
      ) {

        return item;

      }

    }


    return null;

  }


  // ==========================================
  // GET NIFTY WEIGHT
  // ==========================================

  function getNiftyWeight(
    symbol
  ) {

    const clean =
      String(
        symbol || ""
      )
        .replace(
          /-EQ$/i,
          ""
        )
        .trim()
        .toUpperCase();


    if (
      Number.isFinite(
        NIFTY_WEIGHTS[clean]
      )
    ) {

      return NIFTY_WEIGHTS[clean];

    }


    const alias =
      WEIGHT_ALIASES[clean];


    if (
      alias &&
      Number.isFinite(
        NIFTY_WEIGHTS[alias]
      )
    ) {

      return NIFTY_WEIGHTS[alias];

    }


    // Try NIFTY stock master
    const master =
      findNiftyStock(
        clean
      );


    if (master) {

      const masterWeight =
        Number(
          master.weight ??
          master.weightage ??
          master.niftyWeight ??
          0
        );


      if (
        Number.isFinite(masterWeight) &&
        masterWeight > 0
      ) {

        return masterWeight;

      }

    }


    return 0;

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
  // BUDGET PLAN
  // MAX 1 SHARE PER COMPANY
  // ==========================================

  function buildBudgetPlan(
    stocks,
    budget
  ) {

    if (
      !Array.isArray(stocks) ||
      !stocks.length
    ) {

      return [];

    }


    // ----------------------------------------
    // CASE 1
    // FULL TOP 20 POSSIBLE
    // ----------------------------------------

    const totalOneShare =
      stocks.reduce(
        function (sum, stock) {

          return (
            sum +
            stock.price
          );

        },
        0
      );


    if (
      totalOneShare <=
      budget
    ) {

      return stocks.map(
        function (stock) {

          return {

            ...stock,

            quantity:
              1,

            investment:
              stock.price,

            status:
              "FULL"

          };

        }
      );

    }


    // ----------------------------------------
    // BUDGET IS NOT ENOUGH
    //
    // Choose stocks using:
    // 1. Nifty weight
    // 2. target allocation
    // 3. affordable price
    // 4. live ranking
    //
    // Still maximum 1 share.
    // ----------------------------------------

    const candidates =
      stocks
        .map(
          function (stock, index) {

            const target =
              stock.targetAmount;


            const price =
              stock.price;


            const targetFit =
              Math.min(
                1,
                target /
                price
              );


            const rankBonus =
              Math.max(
                0,
                20 - index
              ) /
              100;


            return {

              ...stock,

              selectionScore:
                (
                  stock.niftyWeight *
                  2
                ) +
                (
                  targetFit *
                  2
                ) +
                rankBonus

            };

          }
        )
        .filter(
          function (stock) {

            return (
              stock.price <=
              budget
            );

          }
        )
        .sort(
          function (a, b) {

            return (
              b.selectionScore -
              a.selectionScore
            );

          }
        );


    // ----------------------------------------
    // Greedy selection
    // ----------------------------------------

    const selected =
      [];

    let remaining =
      budget;


    for (
      let i = 0;
      i < candidates.length;
      i++
    ) {

      const stock =
        candidates[i];


      if (
        stock.price <=
        remaining
      ) {

        selected.push({

          ...stock,

          quantity:
            1,

          investment:
            stock.price,

          status:
            "BUDGET"

        });


        remaining -=
          stock.price;

      }

    }


    // ----------------------------------------
    // Second pass:
    // use remaining cash for a better
    // weight-coverage candidate if possible
    // ----------------------------------------

    const selectedSymbols =
      new Set(
        selected.map(
          function (stock) {
            return stock.symbol;
          }
        )
      );


    const remainingCandidates =
      stocks.filter(
        function (stock) {

          return (
            !selectedSymbols.has(
              stock.symbol
            ) &&
            stock.price <=
            remaining
          );

        }
      )
      .sort(
        function (a, b) {

          return (
            b.niftyWeight -
            a.niftyWeight
          );

        }
      );


    for (
      let i = 0;
      i < remainingCandidates.length;
      i++
    ) {

      const stock =
        remainingCandidates[i];


      if (
        stock.price <=
        remaining
      ) {

        selected.push({

          ...stock,

          quantity:
            1,

          investment:
            stock.price,

          status:
            "BUDGET"

        });


        remaining -=
          stock.price;

        break;

      }

    }


    return selected;

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


        info.appendChild(name);

        info.appendChild(sector);

        left.appendChild(rank);

        left.appendChild(info);


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


        right.appendChild(change);

        right.appendChild(price);

        row.appendChild(left);

        row.appendChild(right);

        fragment.appendChild(row);

      }
    );


    list.replaceChildren(
      fragment
    );

  }


  // ==========================================
  // RECOMMENDATION TABLE
  // ==========================================

  function buildRecommendationHTML(
    amount,
    top20,
    selected,
    totalTop20Weight,
    oneShareRequired,
    actualInvestment,
    remaining,
    shortfall,
    coverage
  ) {

    const selectedMap =
      new Map();


    selected.forEach(
      function (stock) {

        selectedMap.set(
          stock.symbol,
          stock
        );

      }
    );


    let html =
      "";


    // ========================================
    // SUMMARY
    // ========================================

    html +=
      `<div class="investment-summary"
        style="
          padding:14px;
          margin-bottom:14px;
          border:1px solid #303846;
          border-radius:10px;
        ">`;


    html +=
      `<div class="investment-title">
        Nifty Weight Based Top-20 Plan
      </div>`;


    html +=
      `<div style="line-height:1.8;">`;


    html +=
      `Budget: <strong>₹${formatMoney(amount)}</strong><br>`;


    html +=
      `Top 20 Combined Nifty Weight:
      <strong>${totalTop20Weight.toFixed(2)}%</strong><br>`;


    html +=
      `1 Share Each — Required:
      <strong>₹${formatMoney(oneShareRequired)}</strong><br>`;


    html +=
      `Actual Investment:
      <strong>₹${formatMoney(actualInvestment)}</strong><br>`;


    html +=
      `Remaining Balance:
      <strong>₹${formatMoney(remaining)}</strong><br>`;


    html +=
      `Top 20 Coverage:
      <strong>${coverage}/20</strong>`;



    if (shortfall > 0) {

      html +=
        `<br>Additional Amount Needed for 20/20:
        <strong>₹${formatMoney(shortfall)}</strong>`;

    }


    html +=
      `</div>`;


    html +=
      `</div>`;


    // ========================================
    // TABLE
    // ========================================

    html +=
      `<div style="
        width:100%;
        overflow-x:auto;
        margin-top:12px;
      ">`;


    html +=
      `<table style="
        width:100%;
        min-width:980px;
        border-collapse:collapse;
        font-size:12px;
      ">`;


    html +=
      `<thead>`;


    html +=
      `<tr>`;


    const headers = [

      "Rank",
      "Company",
      "Symbol",
      "Nifty Weight",
      "Budget %",
      "Target ₹",
      "Price",
      "Qty",
      "Actual ₹",
      "Gap ₹",
      "Status"

    ];


    headers.forEach(
      function (header) {

        html +=
          `<th style="
            padding:9px 7px;
            text-align:left;
            border-bottom:1px solid #394150;
            white-space:nowrap;
          ">${header}</th>`;

      }
    );


    html +=
      `</tr>`;


    html +=
      `</thead>`;


    html
