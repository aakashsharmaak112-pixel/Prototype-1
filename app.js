// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + TOP 20 WEIGHTED ALLOCATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  // ==========================================
  // CONFIG
  // ==========================================

  const TOP_STOCK_COUNT = 20;

  // One stock should not normally exceed this
  // percentage of the entered budget.
  const MAX_STOCK_ALLOCATION = 0.35;

  // Maximum practical concentration for a business
  // group. This is a soft allocation control.
  const MAX_BUSINESS_GROUP_ALLOCATION = 0.30;

  // Maximum practical concentration for a sector.
  const MAX_SECTOR_ALLOCATION = 0.40;

  // Very small leftover amounts are accepted as cash.
  const CASH_TOLERANCE = 0.01;

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
      // GET CURRENT LIVE MARKET DATA
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
      // RANK BY LIVE PERFORMANCE
      // ----------------------------------------

      stocks.sort(
        function (a, b) {

          return b.change - a.change;

        }
      );


      // ----------------------------------------
      // TOP 20 ONLY
      // ----------------------------------------

      stocks =
        stocks.slice(
          0,
          TOP_STOCK_COUNT
        );


      // ----------------------------------------
      // APPLY NIFTY WEIGHTS
      // ----------------------------------------

      stocks =
        stocks.map(
          function (stock) {

            return {

              ...stock,

              niftyWeight:
                getNiftyWeight(
                  stock
                )

            };

          }
        );


      // ----------------------------------------
      // NORMALIZE TOP 20 WEIGHTS
      // ----------------------------------------

      const weightTotal =
        stocks.reduce(
          function (
            total,
            stock
          ) {

            return (
              total +
              stock.niftyWeight
            );

          },
          0
        );


      if (
        weightTotal <= 0
      ) {

        return {

          success: false,

          message:
            "Top 20 stocks ke Nifty weights available nahi hain."

        };

      }


      stocks =
        stocks.map(
          function (stock) {

            return {

              ...stock,

              top20Weight:
                (
                  stock.niftyWeight /
                  weightTotal
                ) * 100

            };

          }
        );


      // ----------------------------------------
      // BUILD WEIGHTED WHOLE-SHARE PORTFOLIO
      // ----------------------------------------

      const allocation =
        buildWeightedPortfolio(
          stocks,
          amount
        );


      if (
        !allocation.selected.length
      ) {

        return {

          success: false,

          message:
            "Current Top 20 mein is budget ke andar whole-share allocation possible nahi bana."

        };

      }


      // ----------------------------------------
      // FINAL SAFETY
      // ----------------------------------------

      let totalInvestment =
        allocation.totalInvestment;


      // Never allow budget crossing.
      if (
        totalInvestment >
        amount
      ) {

        totalInvestment =
          amount;

      }


      const balance =
        Math.max(
          0,
          amount -
          allocation.totalInvestment
        );


      // ----------------------------------------
      // RESULT
      // ----------------------------------------

      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            allocation.selected,
            allocation.top20,
            allocation.totalInvestment,
            balance,
            allocation.fullTargetInvestment
          ),

        selectedStocks:
          allocation.selected,

        totalInvestment:
          allocation.totalInvestment,

        balance:
          balance,

        fullTargetInvestment:
          allocation.fullTargetInvestment,

        top20:
          allocation.top20

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
          item.companyName ||
          item.displaySymbol ||
          key,

        sector:
          item.sector ||
          "",

        businessGroup:
          item.businessGroup ||
          item.group ||
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
          0,

        niftyWeight:
          item.niftyWeight ??
          item.weight ??
          item.indexWeight ??
          item.weightage ??
          item.percentage ??
          null

      });

    }


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
      ).trim();


    const businessGroup =
      String(
        stock.businessGroup ||
        stock.group ||
        (
          master &&
          (
            master.businessGroup ||
            master.group
          )
        ) ||
        getKnownBusinessGroup(symbol)
      ).trim();


    const weight =
      Number(
        stock.niftyWeight ??
        stock.weight ??
        stock.indexWeight ??
        stock.weightage ??
        stock.percentage ??
        (
          master &&
          (
            master.niftyWeight ??
            master.weight ??
            master.indexWeight ??
            master.weightage ??
            master.percentage
          )
        )
      );


    return {

      symbol:
        symbol,

      name:
        name,

      sector:
        sector,

      businessGroup:
        businessGroup,

      price:
        price,

      change:
        change,

      niftyWeight:
        Number.isFinite(weight) &&
        weight > 0
          ? weight
          : 0

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
        list[i] || {};


      const itemSymbol =
        String(
          item.symbol ||
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
    stock
  ) {

    if (
      stock &&
      Number.isFinite(
        stock.niftyWeight
      ) &&
      stock.niftyWeight > 0
    ) {

      return stock.niftyWeight;

    }


    const master =
      findNiftyStock(
        stock.symbol
      );


    if (master) {

      const weight =
        Number(
          master.niftyWeight ??
          master.weight ??
          master.indexWeight ??
          master.weightage ??
          master.percentage
        );


      if (
        Number.isFinite(weight) &&
        weight > 0
      ) {

        return weight;

      }

    }


    // If exact weight is unavailable,
    // temporarily use equal weight.
    // This keeps the engine functional.
    return 1;

  }


  // ==========================================
  // KNOWN BUSINESS GROUPS
  // ==========================================

  function getKnownBusinessGroup(
    symbol
  ) {

    const groups = {

      ADANIENT:
        "Adani Group",

      ADANIPORTS:
        "Adani Group",

      APOLLOHOSP:
        "Apollo Group",

      BAJAJ-AUTO:
        "Bajaj Group",

      BAJFINANCE:
        "Bajaj Group",

      BAJAJFINSV:
        "Bajaj Group",

      BHARTIARTL:
        "Bharti Group",

      HDFCBANK:
        "HDFC Group",

      HDFCLIFE:
        "HDFC Group",

      ICICIBANK:
        "ICICI Group",

      ICICIPRULI:
        "ICICI Group",

      KOTAKBANK:
        "Kotak Group",

      RELIANCE:
        "Reliance Group",

      LT:
        "Larsen & Toubro Group",

      M&M:
        "Mahindra Group",

      MARUTI:
        "Suzuki / Maruti",

      TATAMOTORS:
        "Tata Group",

      TATASTEEL:
        "Tata Group",

      TCS:
        "Tata Group",

      TITAN:
        "Tata Group",

      INFY:
        "Infosys Group",

      WIPRO:
        "Wipro Group"

    };


    return (
      groups[symbol] ||
      "Independent / Other"
    );

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
        .slice(
          0,
          TOP_STOCK_COUNT
        );


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
  // WEIGHTED PORTFOLIO ENGINE
  // ==========================================

  function buildWeightedPortfolio(
    stocks,
    amount
  ) {

    const top20 =
      Array.isArray(stocks)
        ? stocks.slice(
            0,
            TOP_STOCK_COUNT
          )
        : [];


    if (!top20.length) {

      return {

        selected: [],

        top20: [],

        totalInvestment: 0,

        fullTargetInvestment: amount

      };

    }


    // ----------------------------------------
    // TARGET RUPEE ALLOCATION
    // ----------------------------------------

    const targetStocks =
      top20.map(
        function (stock) {

          const targetAmount =
            amount *
            (
              stock.top20Weight /
              100
            );


          return {

            ...stock,

            targetAmount:
              targetAmount,

            quantity:
              0,

            investment:
              0

          };

        }
      );


    // ----------------------------------------
    // INITIAL WHOLE-SHARE ALLOCATION
    // ----------------------------------------

    let total =
      0;


    targetStocks.forEach(
      function (stock) {

        if (
          stock.price <=
          0
        ) {

          return;

        }


        const maximum =
          Math.min(
            stock.targetAmount,
            amount *
            MAX_STOCK_ALLOCATION
          );


        const quantity =
          Math.floor(
            maximum /
            stock.price
          );


        if (
          quantity <= 0
        ) {

          return;

        }


        stock.quantity =
          quantity;


        stock.investment =
          quantity *
          stock.price;


        total +=
          stock.investment;

      }
    );


    // ----------------------------------------
    // REMOVE CONCENTRATION VIOLATIONS
    // ----------------------------------------

    enforceConcentrationLimits(
      targetStocks,
      amount
    );


    total =
      calculateTotal(
        targetStocks
      );


    // ----------------------------------------
    // FILL REMAINING MONEY
    // ----------------------------------------

    improveWholeShareAllocation(
      targetStocks,
      amount
    );


    total =
      calculateTotal(
        targetStocks
      );


    // ----------------------------------------
    // FINAL SELECTED STOCKS
    // ----------------------------------------

    const selected =
      targetStocks.filter(
        function (stock) {

          return (
            stock.quantity > 0 &&
            stock.investment > 0
          );

        }
      );


    // ----------------------------------------
    // FINAL ACTUAL PERCENTAGE
    // ----------------------------------------

    selected.forEach(
      function (stock) {

        stock.actualPercent =
          amount > 0
            ? (
                stock.investment /
                amount
              ) * 100
            : 0;


        stock.difference =
          stock.actualPercent -
          stock.top20Weight;

      }
    );


    targetStocks.forEach(
      function (stock) {

        stock.actualPercent =
          amount > 0
            ? (
                stock.investment /
                amount
              ) * 100
            : 0;


        stock.difference =
          stock.actualPercent -
          stock.top20Weight;

      }
    );


    return {

      selected:
        selected,

      top20:
        targetStocks,

      totalInvestment:
        total,

      fullTargetInvestment:
        amount

    };

  }


  // ==========================================
  // CONCENTRATION CONTROL
  // ==========================================

  function enforceConcentrationLimits(
    stocks,
    amount
  ) {

    if (
      !Array.isArray(stocks) ||
      !stocks.length ||
      amount <= 0
    ) {

      return;

    }


    let changed =
      true;


    while (changed) {

      changed =
        false;


      // --------------------------------------
      // STOCK LIMIT
      // --------------------------------------

      for (
        let i = 0;
        i < stocks.length;
        i++
      ) {

        const stock =
          stocks[i];


        const maxStock =
          amount *
          MAX_STOCK_ALLOCATION;


        while (
          stock.investment >
          maxStock &&
          stock.quantity > 0
        ) {

          stock.quantity -=
            1;


          stock.investment =
            stock.quantity *
            stock.price;


          changed =
            true;

        }

      }


      // --------------------------------------
      // BUSINESS GROUP LIMIT
      // --------------------------------------

      const groupTotals =
        {};


      stocks.forEach(
        function (stock) {

          const group =
            stock.businessGroup ||
            "Independent / Other";


          groupTotals[group] =
            (
              groupTotals[group] ||
              0
            ) +
            stock.investment;

        }
      );


      Object.keys(
        groupTotals
      ).forEach(
        function (group) {

          const limit =
            amount *
            MAX_BUSINESS_GROUP_ALLOCATION;


          if (
            groupTotals[group] <=
            limit
          ) {

            return;

          }


          const groupStocks =
            stocks
              .filter(
