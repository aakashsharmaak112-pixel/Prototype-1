// ============================================================
// PROTOTYPE-1 — APP ENGINE V5.1
// MONTHLY TOP-20
// DAILY MONITORING
// WATCH / IMPROVING / EXIT REVIEW
// SMART WHOLE-SHARE ALLOCATION
// INVESTMENT + PORTFOLIO TRACKING
//
// V5.1 FIXES
// 1. Monthly Top-20 cannot be overwritten by daily ranking
// 2. Analyze does NOT create fake portfolio purchases
// 3. EXIT REVIEW requires persistent deterioration
// 4. Monthly decision and daily ranking remain separate
// ============================================================

(function () {
  "use strict";

  console.log("Prototype-1 app.js V5.1 loading...");

  // ==========================================================
  // SETTINGS
  // ==========================================================

  const TARGET_TOP20 = 20;

  const NORMAL_MAX_STOCK = 0.20;
  const SMALL_BUDGET_MAX_STOCK = 0.25;
  const HARD_MAX_STOCK = 0.35;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  const MIN_DIVERSIFIED_STOCKS = 5;

  const PORTFOLIO_KEY =
    "prototype1_portfolio_v5";

  const MONTHLY_KEY =
    "prototype1_monthly_top20_v5";

  const DAILY_KEY =
    "prototype1_daily_monitoring_v5";

  const DAILY_HISTORY_LIMIT = 31;

  const EXIT_REVIEW_MIN_DAYS = 2;

  let isConnecting = false;


  // ==========================================================
  // DOM READY
  // ==========================================================

  document.addEventListener("DOMContentLoaded", function () {

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


    // ========================================================
    // CONNECT LIVE DATA
    // ========================================================

    connectButton.addEventListener(
      "click",
      async function () {

        if (isConnecting) return;

        const totp =
          String(
            totpInput.value || ""
          ).trim();

        hideError();

        if (!/^\d{6}$/.test(totp)) {

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

          /*
           * IMPORTANT:
           * Monitoring initialize/update hoti hai,
           * lekin existing monthly Top-20 overwrite nahi hota.
           */
          runMonitoring();

          renderTop20();

          recommendation.innerHTML =
            `Live market data connected successfully. ${received}/${requested} stocks received.`;

          console.log(
            `Live market data connected: ${received}/${requested}`
          );

        } catch (error) {

          console.error(
            "Connect error:",
            error
          );

          showError(
            error && error.message
              ? error.message
              : "Live market data connect nahi ho paya."
          );

          setMarketStatus(
            "ERROR",
            "status-error"
          );

        } finally {

          isConnecting = false;

          connectButton.disabled = false;
          analyzeButton.disabled = false;

          connectButton.textContent =
            "Connect Live Market Data";
        }
      }
    );


    // ========================================================
    // ANALYZE
    // ========================================================

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

          /*
           * Ensure monthly monitoring memory exists,
           * but NEVER replace an existing monthly Top-20.
           */
          runMonitoring();

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

            /*
             * IMPORTANT:
             * Analyze is only a recommendation.
             * It must NOT create a real portfolio purchase.
             */
            appendMonitoringToRecommendation();

          } else {

            recommendation.innerHTML =
              result && result.message
                ? result.message
                : "Investment analysis available nahi hai.";
          }

        } catch (error) {

          console.error(
            "Investment analysis error:",
            error
          );

          recommendation.innerHTML =
            "Investment analysis mein error aaya.";
        }
      }
    );


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


    if (
      window.MARKET_DATA &&
      window.MARKET_DATA.success
    ) {

      runMonitoring();
      renderTop20();
    }

  });


  // ==========================================================
  // MAIN ANALYSIS
  // ==========================================================

  window.analyzeInvestmentAmount =
    function (amount) {

      amount = Number(amount);

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

      const stocks =
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

      const ranked =
        smartRankStocks(stocks);

      /*
       * MONTHLY DECISION
       *
       * Existing monthly Top-20 is the primary reference.
       * Current daily ranking cannot overwrite it.
       */
      let monthly =
        getSavedMonthly();

      if (
        !monthly ||
        monthly.month !==
        currentMonthKey()
      ) {

        monthly =
          createMonthlyTop20(
            ranked
          );
      }

      const monthlySymbols =
        Array.isArray(
          monthly.symbols
        )
          ? monthly.symbols
          : [];

      const monthlyStocks =
        monthlySymbols
          .map(
            symbol =>
              ranked.find(
                s =>
                  s.symbol ===
                  symbol
              )
          )
          .filter(Boolean);

      /*
       * If some monthly stocks are temporarily missing
       * from live data, do not replace them with daily
       * ranking. Use available monthly members only.
       */
      let top20 =
        monthlyStocks.slice(
          0,
          TARGET_TOP20
        );

      /*
       * Safety fallback only for a corrupted/empty monthly
       * memory. This creates a new monthly baseline.
       */
      if (!top20.length) {

        monthly =
          createMonthlyTop20(
            ranked
          );

        top20 =
          monthly.symbols
            .map(
              symbol =>
                ranked.find(
                  s =>
                    s.symbol ===
                    symbol
                )
            )
            .filter(Boolean)
            .slice(
              0,
              TARGET_TOP20
            );
      }

      const result =
        buildSmartPlan(
          top20,
          amount
        );

      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            top20,
            result,
            monthly
          ),

        selectedStocks:
          result.selected.filter(
            s =>
              s.quantity > 0
          ),

        totalInvestment:
          result.totalInvestment,

        balance:
          result.balance,

        top20,

        monthlyTop20:
          monthly.symbols
      };
    };


  // ==========================================================
  // RANKING
  // ==========================================================

  function smartRankStocks(stocks) {

    return stocks
      .map(function (stock) {

        const master =
          findNiftyStock(
            stock.symbol
          );

        const change =
          Number(
            stock.change || 0
          );

        const momentum =
          Math.max(
            -5,
            Math.min(
              5,
              change
            )
          );

        const priority =
          master &&
          Number.isFinite(
            Number(
              master.priority
            )
          )
            ? Number(
                master.priority
              )
            : 0;

        return {

          ...stock,

          engineScore:
            change +
            momentum * 0.10 +
            priority * 0.001
        };

      })
      .sort(
        (a, b) =>
          b.engineScore -
          a.engineScore
      );
  }


  // ==========================================================
  // MARKET DATA
  // ==========================================================

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

    return Object.keys(
      market.stocks
    ).map(function (key) {

      const item =
        market.stocks[key] || {};

      return {

        symbol:
          item.symbol ||
          item.neoSymbol ||
          key,

        name:
          item.name ||
          item.companyName ||
          item.displaySymbol ||
          key,

        sector:
          item.sector ||
          item.industry ||
          "",

        businessGroup:
          item.businessGroup ||
          item.group ||
          item.parentGroup ||
          "",

        price:
          item.price ??
          item.ltp ??
          item.lastPrice ??
          item.close ??
          0,

        change:
          item.perChange ??
          item.change ??
          item.percentChange ??
          0,

        chartScore:
          item.chartScore ??
          item.technicalScore,

        fundamentalScore:
          item.fundamentalScore,

        newsScore:
          item.newsScore
      };
    });
  }


  // ==========================================================
  // NORMALIZE
  // ==========================================================

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

    return {

      ...stock,

      symbol,

      name:
        String(
          stock.name ||
          stock.companyName ||
          (
            master &&
            master.name
          ) ||
          stock.displaySymbol ||
          symbol
        ).trim(),

      price:
        Number(
          stock.price ??
          stock.ltp ??
          stock.lastPrice ??
          stock.close ??
          0
        ),

      change:
        Number(
          stock.perChange ??
          stock.change ??
          stock.percentChange ??
          0
        ),

      sector:
        String(
          stock.sector ||
          (
            master &&
            master.sector
          ) ||
          "Nifty 50"
        ).trim(),

      businessGroup:
        String(
          stock.businessGroup ||
          stock.group ||
          stock.parentGroup ||
          (
            master &&
            (
              master.businessGroup ||
              master.group
            )
          ) ||
          inferBusinessGroup(
            symbol
          )
        ).trim()
    };
  }


  // ==========================================================
  // NIFTY MASTER
  // ==========================================================

  function findNiftyStock(symbol) {

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


  // ==========================================================
  // BUSINESS GROUP
  // ==========================================================

  function inferBusinessGroup(symbol) {

    const groups = {

      ADANIENT:
        "Adani Group",

      ADANIPORTS:
        "Adani Group",

      HDFCBANK:
        "HDFC Group",

      HDFCLIFE:
        "HDFC Group",

      ICICIBANK:
        "ICICI Group",

      ICICIPRULI:
        "ICICI Group",

      BAJFINANCE:
        "Bajaj Group",

      BAJAJFINSV:
        "Bajaj Group",

      "BAJAJ-AUTO":
        "Bajaj Group",

      BAJAJ_AUTO:
        "Bajaj Group",

      RELIANCE:
        "Reliance Group",

      TATAMOTORS:
        "Tata Group",

      TATASTEEL:
        "Tata Group",

      TCS:
        "Tata Group",

      TITAN:
        "Tata Group",

      TRENT:
        "Tata Group",

      LT:
        "Larsen Group",

      SBIN:
        "SBI Group"
    };

    return (
      groups[symbol] ||
      symbol
    );
  }


  // ==========================================================
  // VALID STOCK
  // ==========================================================

  function isValidStock(stock) {

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


  // ==========================================================
  // MONTHLY TOP-20 MEMORY
  // ==========================================================

  function currentMonthKey() {

    const d =
      new Date();

    return (
      d.getFullYear() +
      "-" +
      String(
        d.getMonth() + 1
      ).padStart(
        2,
        "0"
      )
    );
  }


  function getSavedMonthly() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            MONTHLY_KEY
          ) || "null"
        );

      if (
        saved &&
        saved.month ===
        currentMonthKey() &&
        Array.isArray(
          saved.symbols
        )
      ) {

        return saved;
      }

    } catch (e) {

      console.warn(
        "Monthly memory read failed",
        e
      );
    }

    return null;
  }


  function createMonthlyTop20(
    ranked
  ) {

    const symbols =
      ranked
        .slice(
          0,
          TARGET_TOP20
        )
        .map(
          s =>
            s.symbol
        );

    const monthly = {

      month:
        currentMonthKey(),

      symbols,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString()
    };

    saveMonthly(
      monthly
    );

    console.log(
      "New monthly Top-20 created:",
      symbols
    );

    return monthly;
  }


  function saveMonthly(
    data
  ) {

    try {

      localStorage.setItem(
        MONTHLY_KEY,
        JSON.stringify(
          data
        )
      );

    } catch (e) {

      console.warn(
        "Monthly data save failed",
        e
      );
    }
  }


  // ==========================================================
  // SMART WHOLE-SHARE PLAN
  // ==========================================================

  function buildSmartPlan(
    stocks,
    budget
  ) {

    const count =
      stocks.length;

    if (!count) {

      return {

        selected: [],

        totalInvestment: 0,

        balance:
          budget
      };
    }

    const weightTotal =
      stocks.reduce(
        (
          sum,
          stock,
          index
        ) =>
          sum +
          (
            count -
            index
          ),
        0
      );

    const selected =
      stocks.map(
        function (
          stock,
          index
        ) {

          const weight =
            count -
            index;

          const target =
            weight /
            weightTotal;

          return {

            ...stock,

            rank:
              index + 1,

            rankWeight:
              weight,

            targetPercent:
              target * 100,

            targetAmount:
              budget * target,

            quantity: 0,

            investment: 0,

            actualPercent: 0,

            sectorPercent: 0,

            groupPercent: 0
          };
        }
      );


    let total = 0;


    // --------------------------------------------------------
    // First diversification
    // --------------------------------------------------------

    const candidates =
      selected
        .filter(
          s =>
            s.price <=
            budget
        )
        .sort(
          (a, b) => {

            const ar =
              a.rankWeight /
              Math.max(
                a.price,
                1
              );

            const br =
              b.rankWeight /
              Math.max(
                b.price,
                1
              );

            return br - ar;
          }
        );


    for (
      const stock of candidates
    ) {

      if (
        countSelected(
          selected
        ) >=
        Math.min(
          MIN_DIVERSIFIED_STOCKS,
          count
        )
      ) {
        break;
      }

      if (
        canAdd(
          stock,
          selected,
          budget,
          budget - total
        )
      ) {

        stock.quantity++;

        stock.investment +=
          stock.price;

        total +=
          stock.price;
      }
    }


    // --------------------------------------------------------
    // Whole-share allocation
    // --------------------------------------------------------

    let guard = 0;

    while (
      guard++ < 20000
    ) {

      const balance =
        budget -
        total;

      if (
        balance <= 0
      ) {
        break;
      }

      const possible =
        selected
          .filter(
            stock =>
              canAdd(
                stock,
                selected,
                budget,
                balance
              )
          )
          .map(
            stock => ({

              stock,

              score:
                allocationScore(
                  stock,
                  selected,
                  budget,
                  balance
                )
            })
          )
          .sort(
            (a, b) =>
              b.score -
              a.score
          );

      if (
        !possible.length
      ) {
        break;
      }

      const chosen =
        possible[0].stock;

      chosen.quantity++;

      chosen.investment +=
        chosen.price;

      total +=
        chosen.price;
    }


    calculateConcentration(
      selected,
      total
    );


    return {

      selected,

      totalInvestment:
        total,

      balance:
        Math.max(
          0,
          budget - total
        )
    };
  }


  // ==========================================================
  // CAN ADD SHARE
  // ==========================================================

  function canAdd(
    stock,
    selected,
    budget,
    balance
  ) {

    if (
      !stock ||
      stock.price >
      balance
    ) {
      return false;
    }

    let stockLimit =
      NORMAL_MAX_STOCK;

    if (
      stock.investment === 0 &&
      stock.price <=
      budget *
      SMALL_BUDGET_MAX_STOCK
    ) {

      stockLimit =
        SMALL_BUDGET_MAX_STOCK;
    }

    const maxStock =
      Math.min(
        HARD_MAX_STOCK,
        stockLimit
      ) *
      budget;

    if (
      stock.investment +
      stock.price >
      maxStock +
      0.000001
    ) {
      return false;
    }

    const sector =
      stock.sector ||
      "Nifty 50";

    const group =
      stock.businessGroup ||
      stock.symbol;

    const sectorTotal =
      getSectorTotals(
        selected
      )[sector] || 0;

    const groupTotal =
      getGroupTotals(
        selected
      )[group] || 0;

    if (
      sectorTotal +
      stock.price >
      budget *
      MAX_SECTOR_ALLOCATION +
      0.000001
    ) {
      return false;
    }

    if (
      groupTotal +
      stock.price >
      budget *
      MAX_GROUP_ALLOCATION +
      0.000001
    ) {
      return false;
    }

    return true;
  }


  // ==========================================================
  // ALLOCATION SCORE
  // ==========================================================

  function allocationScore(
    stock,
    selected,
    budget,
    balance
  ) {

    const target =
      Math.max(
        stock.targetAmount,
        1
      );

    const gap =
      Math.max(
        0,
        target -
        stock.investment
      );

    const gapScore =
      Math.min(
        2,
        gap / target
      );

    const rankScore =
      stock.rankWeight /
      Math.max(
        selected.length,
        1
      );

    const sector =
      stock.sector ||
      "Nifty 50";

    const group =
      stock.businessGroup ||
      stock.symbol;

    const sectorRatio =
      (
        getSectorTotals(
          selected
        )[sector] || 0
      ) /
      Math.max(
        budget,
        1
      );

    const groupRatio =
      (
        getGroupTotals(
          selected
        )[group] || 0
      ) /
      Math.max(
        budget,
        1
      );

    const diversification =
      (
        1 -
        sectorRatio
      ) +
      (
        1 -
        groupRatio
      );

    const utilization =
      stock.price <=
      balance
        ? stock.price /
          Math.max(
            balance,
            1
          )
        : 0;

    const momentum =
      Math.max(
        -3,
        Math.min(
          3,
          Number(
            stock.change || 0
          )
        )
      );

    return (

      gapScore * 5 +

      rankScore * 2.5 +

      diversification * 1.5 +

      utilization * 1.2 +

      momentum * 0.15
    );
  }


  // ==========================================================
  // CONCENTRATION
  // ==========================================================

  function getSectorTotals(
    stocks
  ) {

    const totals = {};

    stocks.forEach(
      stock => {

        const key =
          stock.sector ||
          "Nifty 50";

        totals[key] =
          (
            totals[key] ||
            0
          ) +
          Number(
            stock.investment ||
            0
          );
      }
    );

    return totals;
  }


  function getGroupTotals(
    stocks
  ) {

    const totals = {};

    stocks.forEach(
      stock => {

        const key =
          stock.businessGroup ||
          stock.symbol;

        totals[key] =
          (
            totals[key] ||
            0
          ) +
          Number(
            stock.investment ||
            0
          );
      }
    );

    return totals;
  }


  function calculateConcentration(
    stocks,
    total
  ) {

    const sectors =
      getSectorTotals(
        stocks
      );

    const groups =
      getGroupTotals(
        stocks
      );

    stocks.forEach(
      stock => {

        stock.actualPercent =
          total > 0
            ? stock.investment /
              total *
              100
            : 0;

        stock.sectorPercent =
          total > 0
            ? (
                sectors[
                  stock.sector
                ] || 0
              ) /
              total *
              100
            : 0;

        stock.groupPercent =
          total > 0
            ? (
                groups[
                  stock.businessGroup
                ] || 0
              ) /
              total *
              100
            : 0;
      }
    );
  }


  function countSelected(
    stocks
  ) {

    return stocks.filter(
      s =>
        s.quantity > 0
    ).length;
  }


  // ==========================================================
  // CURRENT DAILY TOP-20 DISPLAY
  // ==========================================================

  function renderTop20() {

    const list =
      document.getElementById(
        "top20List"
      );

    if (!list) return;

    const stocks =
      smartRankStocks(
        getStocksFromMarketData()
          .map(normalizeStock)
          .filter(isValidStock)
      ).slice(
        0,
        TARGET_TOP20
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
          index + 1;

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
          `${
            stock.change >= 0
              ? "+"
              : ""
          }${stock.change.toFixed(2)}%`;

        const price =
          document.createElement(
            "div"
          );

        price.textContent =
          `₹${formatMoney(
            stock.price
          )}`;

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


  // ==========================================================
  // MONTHLY + DAILY MONITORING
  // ==========================================================

  function runMonitoring() {

    const stocks =
      smartRankStocks(
        getStocksFromMarketData()
          .map(normalizeStock)
          .filter(isValidStock)
      );

    if (!stocks.length) {

      return {

        success: false,

        monitored: []
      };
    }


    const currentTop20 =
      stocks
        .slice(
          0,
          TARGET_TOP20
        )
        .map(
          s =>
            s.symbol
        );


    // --------------------------------------------------------
    // Monthly memory
    // --------------------------------------------------------

    let monthly =
      getSavedMonthly();

    if (!monthly) {

      monthly =
        createMonthlyTop20(
          stocks
        );
    }


    // --------------------------------------------------------
    // Daily snapshot
    // --------------------------------------------------------

    const today =
      localDateKey();

    const snapshot =
      stocks.map(
        function (
          stock,
          index
        ) {

          return {

            symbol:
              stock.symbol,

            dailyRank:
              index + 1,

            change:
              stock.change,

            price:
              stock.price
          };
        }
      );


    const history =
      getDailyHistory();

    const todayIndex =
      history.findIndex(
        item =>
          item.date ===
          today
      );


    if (
      todayIndex >= 0
    ) {

      history[
        todayIndex
      ].data =
        snapshot;

    } else {

      history.push({

        date:
          today,

        data:
          snapshot
      });
    }


    const trimmedHistory =
      history.slice(
        -DAILY_HISTORY_LIMIT
      );


    saveDailyHistory(
      trimmedHistory
    );


    // --------------------------------------------------------
    // Monitoring status
    // --------------------------------------------------------

    const monitored =
      stocks.map(
        function (
          stock,
          index
        ) {

          const monthlyRank =
            monthly.symbols.indexOf(
              stock.symbol
            ) + 1;

          const dailyRank =
            index + 1;

          let status =
            "MONITOR";

          let reason =
            "Daily monitoring continue hai.";


          // --------------------------------------------------
          // Existing Monthly Top-20 stock
          // --------------------------------------------------

          if (
            monthlyRank > 0
          ) {

            if (
              dailyRank <=
              TARGET_TOP20
            ) {

              status =
                "HOLD";

              reason =
                "Monthly Top-20 mein hai; daily fluctuation normal hai.";

            } else {

              status =
                "WATCH";

              reason =
                "Daily ranking Top-20 se bahar hai; monthly investment decision automatically change nahi hoga.";
            }


            // ------------------------------------------------
            // Improvement
            // ------------------------------------------------

            if (
              dailyRank <= 15 &&
              dailyRank <
                monthlyRank
            ) {

              status =
                "IMPROVING";

              reason =
                "Daily position monthly position ke comparison mein improve hui hai.";
            }


            // ------------------------------------------------
            // Persistent deterioration
            // ------------------------------------------------

            const deterioration =
              getDeteriorationStatus(
                stock.symbol,
                trimmedHistory
              );

            if (
              deterioration.exitReview
            ) {

              status =
                "EXIT REVIEW";

              reason =
                `Stock mein persistent deterioration detect hua (${deterioration.badDays} recent monitoring day(s) weak). Detailed review required.`;

            } else if (
              deterioration.badDays > 0 &&
              dailyRank > TARGET_TOP20
            ) {

              status =
                "WATCH";

              reason =
                "Weakness observe hui hai, lekin abhi EXIT REVIEW ke liye confirmation sufficient nahi hai.";
            }
          }


          // --------------------------------------------------
          // New candidate outside monthly Top-20
          // --------------------------------------------------

          else {

            if (
              dailyRank <=
              TARGET_TOP20
            ) {

              status =
                "IMPROVING";

              reason =
                "Stock current daily Top-20 mein hai; next monthly review mein consider kiya jayega.";

            } else {

              status =
                "MONITOR";

              reason =
                "Monthly Top-20 ke bahar hai; monitoring continue rakhein.";
            }
          }


          return {

            symbol:
              stock.symbol,

            name:
              stock.name,

            monthlyRank,

            dailyRank,

            status,

            reason,

            change:
              stock.change,

            price:
              stock.price
          };
        }
      );


    saveDailyMonitoring(
      trimmedHistory,
      monitored
    );


    return {

      success: true,

      month:
        currentMonthKey(),

      monthlyTop20:
        monthly.symbols,

      currentDailyTop20:
        currentTop20,

      monitored,

      history:
        trimmedHistory
    };
  }


  // ==========================================================
  // LOCAL DATE
  // ==========================================================

  function localDateKey() {

    const d =
      new Date();

    return (
      d.getFullYear() +
      "-" +
      String(
        d.getMonth() + 1
      ).padStart(
        2,
        "0"
      ) +
      "-" +
      String(
        d.getDate()
      ).padStart(
        2,
        "0"
      )
    );
  }


  // ==========================================================
  // DAILY HISTORY
  // ==========================================================

  function getDailyHistory() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            DAILY_KEY
          ) || "null"
        );

      if (
        saved &&
        Array.isArray(
          saved.history
        )
      ) {

        return saved.history;
      }

    } catch (e) {

      console.warn(
        "Daily history read failed",
        e
      );
    }

    return [];
  }


  function saveDailyHistory(
    history
  ) {

    try {

      localStorage.setItem(
        DAILY_KEY,
        JSON.stringify({

          updatedAt:
            new Date().toISOString(),

          history
        })
      );

    } catch (e) {

      console.warn(
        "Daily history save failed",
        e
      );
    }
  }


  // ==========================================================
  // DAILY MONITORING COMPATIBILITY SAVE
  // ==========================================================

  function saveDailyMonitoring(
    history,
    monitored
  ) {

    try {

      localStorage.setItem(
        DAILY_KEY,
        JSON.stringify({

          date:
            new Date().toISOString(),

          history,

          data:
            monitored
        })
      );

    } catch (e) {

      console.warn(
        "Daily monitoring save failed",
        e
      );
    }
  }


  // ==========================================================
  // DETERIORATION CHECK
  // ==========================================================

  function getDeteriorationStatus(
    symbol,
    history
  ) {

    const recent =
      history.slice(
        -3
      );

    let badDays = 0;

    recent.forEach(
      function (day) {

        const item =
          Array.isArray(
            day.data
          )
            ? day.data.find(
                x =>
                  x.symbol ===
                  symbol
              )
            : null;

        if (
          item &&
          Number(
            item.dailyRank
          ) >= 30
        ) {

          badDays++;
        }
      }
    );


    /*
     * EXIT REVIEW only after persistent weakness.
     *
     * One weak day:
     * WATCH
     *
     * Two recent weak monitoring days:
     * EXIT REVIEW
     *
     * This prevents a single daily rank fluctuation
     * from triggering unnecessary exit decisions.
     */

    return {

      badDays,

      exitReview:
        badDays >=
        EXIT_REVIEW_MIN_DAYS
    };
  }


  // ==========================================================
  // INVESTMENT TRACKING
  // ==========================================================

  /*
   * IMPORTANT:
   *
   * This function is intentionally NOT called from Analyze.
   *
   * Analyze = recommendation.
   * Purchase = actual transaction.
   *
   * Until a real BUY/transaction action exists,
   * Prototype-1 must not pretend that a purchase happened.
   */

  function saveInvestmentPlan(
    result
  ) {

    if (
      !result ||
      !Array.isArray(
        result.selectedStocks
      )
    ) {
      return false;
    }

    console.warn(
      "saveInvestmentPlan is disabled for Analyze-only flow. Use actual purchase action before updating portfolio."
    );

    return false;
  }


  function getPortfolio() {

    try {

      const saved =
        JSON.parse(
          localStorage.getItem(
            PORTFOLIO_KEY
          ) || "null"
        );

      if (
        saved &&
        Array.isArray(
          saved.positions
        )
      ) {

        return saved;
      }

    } catch (e) {

      console.warn(
        "Portfolio read failed",
        e
      );
    }

    return {

      positions: [],

      totalInvested: 0,

      updatedAt: null
    };
  }


  // ==========================================================
  // PORTFOLIO VALUE
  // ==========================================================

  function calculatePortfolioValue() {

    const portfolio =
      getPortfolio();

    const stocks =
      getStocksFromMarketData()
        .map(
          normalizeStock
        );

    let invested = 0;

    let currentValue = 0;


    portfolio.positions.forEach(
      function (
        position
      ) {

        const live =
          stocks.find(
            s =>
              s.symbol ===
              position.symbol
          );

        const price =
          live &&
          Number.isFinite(
            live.price
          )
            ? live.price
            : Number(
                position.lastPrice ||
                0
              );

        invested +=
          Number(
            position.invested ||
            0
          );

        currentValue +=
          price *
          Number(
            position.quantity ||
            0
          );
      }
    );


    const pnl =
      currentValue -
      invested;

    const pnlPercent =
      invested > 0
        ? pnl /
          invested *
          100
        : 0;


    return {

      invested,

      currentValue,

      pnl,

      pnlPercent
    };
  }


  // ==========================================================
  // PORTFOLIO RISK
  // ==========================================================

  function portfolioWarnings() {

    const portfolio =
      getPortfolio();

    const stocks =
      getStocksFromMarketData()
        .map(
          normalizeStock
        );

    const positions =
      portfolio.positions;

    const warnings = [];


    const values =
      positions.map(
        function (p) {

          const live =
            stocks.find(
              s =>
                s.symbol ===
                p.symbol
            );

          const price =
            live
              ? live.price
              : Number(
                  p.lastPrice ||
                  0
                );

          return {

            ...p,

            value:
              price *
              Number(
                p.quantity ||
                0
              )
          };
        }
      );


    const total =
      values.reduce(
        (
          sum,
          p
        ) =>
          sum +
          p.value,
        0
      );


    if (!total) {
      return warnings;
    }


    values.forEach(
      function (p) {

        const percent =
          p.value /
          total;

        if (
          percent >
          HARD_MAX_STOCK
        ) {

          warnings.push(
            `${p.symbol} portfolio allocation ${(
              percent * 100
            ).toFixed(2)}% hai — risk review required.`
          );
        }
      }
    );


    return warnings;
  }


  // ==========================================================
  // RECOMMENDATION HTML
  // ==========================================================

  function buildRecommendationHTML(
    budget,
    top20,
    result,
    monthly
  ) {

    const selected =
      result.selected.filter(
        s =>
          s.quantity > 0
      );

    let html = "";


    html += `
      <div
        style="
          padding:14px;
          margin-bottom:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.8;
        "
      >

        <div
          style="
            font-size:18px;
            font-weight:bold;
          "
        >
          🤖 Prototype-1 V5.1
        </div>

        <strong>
          Monthly Top-20 Smart Investment Plan
        </strong>

        <br><br>

        Budget:
        <strong>
          ₹${formatMoney(
            budget
          )}
        </strong>

        <br>

        Decision Mode:
        <strong>
          MONTHLY
        </strong>

        <br>

        Daily Monitoring:
        <strong>
          ACTIVE
        </strong>

        <br>

        Monthly Top-20:
        <strong>
          ${
            monthly &&
            Array.isArray(
              monthly.symbols
            )
              ? monthly.symbols.length
              : top20.length
          }
        </strong>

        <br>

        Invested:
        <strong>
          ₹${formatMoney(
            result.totalInvestment
          )}
        </strong>

        <br>

        Balance:
        <strong>
          ₹${formatMoney(
            result.balance
          )}
        </strong>

        <br><br>

        <small>
          Monthly Top-20 investment decision daily ranking
          se automatically change nahi hota.
        </small>

      </div>
    `;


    html += `
      <div
        style="
          overflow-x:auto;
        "
      >

      <table
        style="
          width:100%;
          min-width:950px;
          border-collapse:collapse;
          font-size:13px;
        "
      >

      <thead>
        <tr>
    `;


    [
      "Rank",
      "Company",
      "Price",
      "Target %",
      "Target ₹",
      "Shares",
      "Actual ₹",
      "Actual %",
      "Sector",
      "Group"
    ].forEach(
      function (header) {

        html += `
          <th
            style="
              text-align:left;
              padding:8px;
              border-bottom:
                1px solid #39424e;
              white-space:nowrap;
            "
          >
            ${header}
          </th>
        `;
      }
    );


    html += `
        </tr>
      </thead>

      <tbody>
    `;


    result.selected.forEach(
      function (stock) {

        html += `
          <tr
            style="
              ${
                stock.quantity > 0
                  ? ""
                  : "opacity:0.65;"
              }
            "
          >

            <td style="padding:8px;">
              ${stock.rank}
            </td>

            <td style="padding:8px;">
              <strong>
                ${escapeHtml(
                  stock.name
                )}
              </strong>

              <br>

              <small>
                ${escapeHtml(
                  stock.symbol
                )}
              </small>
            </td>

            <td style="padding:8px;">
              ₹${formatMoney(
                stock.price
              )}
            </td>

            <td style="padding:8px;">
              ${stock.targetPercent.toFixed(2)}%
            </td>

            <td style="padding:8px;">
              ₹${formatMoney(
                stock.targetAmount
              )}
            </td>

            <td style="padding:8px;">
              <strong>
                ${stock.quantity}
              </strong>
            </td>

            <td style="padding:8px;">
              ₹${formatMoney(
                stock.investment
              )}
            </td>

            <td style="padding:8px;">
              ${stock.actualPercent.toFixed(2)}%
            </td>

            <td style="padding:8px;">
              ${escapeHtml(
                stock.sector
              )}
            </td>

            <td style="padding:8px;">
              ${escapeHtml(
                stock.businessGroup
              )}
            </td>

          </tr>
        `;
      }
    );


    html += `
      </tbody>
      </table>
      </div>
    `;


    html += `
      <div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.8;
        "
      >

        <strong>
          📌 Selected Stocks
        </strong>

        <br>
    `;


    if (
      selected.length
    ) {

      selected.forEach(
        function (stock) {

          html += `
            • ${escapeHtml(
              stock.symbol
            )}
            — ${stock.quantity}
            share(s)
            — ₹${formatMoney(
              stock.investment
            )}
            <br>
          `;
        }
      );

    } else {

      html +=
        "No stock could be allocated within current safety rules.<br>";
    }


    html += `
      </div>

      <div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.75;
        "
      >

        <strong>
          🧠 V5.1 Decision Logic
        </strong>

        <br>

        • Monthly Top-20 investment decision ka primary reference hai.
        <br>

        • Existing monthly Top-20 same month mein overwrite nahi hota.
        <br>

        • Daily rank sirf monitoring signal hai.
        <br>

        • Daily fluctuation se automatic BUY/SELL nahi hoga.
        <br>

        • Top-20 se bahar jaane par WATCH signal milega.
        <br>

        • Persistent deterioration par EXIT REVIEW milega.
        <br>

        • Improving candidate next monthly review ke liye monitor hoga.
        <br>

        • Analyze karne se portfolio mein fake purchase add nahi hoti.
        <br>

        • Whole-share allocation use hota hai.
        <br>

        • Normal individual-stock limit 20% hai.
        <br>

        • Small-budget first-share limit 25% hai.
        <br>

        • Hard stock limit 35% hai.
        <br>

        • Sector limit 40% hai.
        <br>

        • Business-group limit 30% hai.
        <br>

        • Budget kabhi exceed nahi hoga.
        <br>

        • Existing portfolio ki valuation live price se calculate hogi.
        <br>

        • Chart/fundamental/news score available hone par hi use hoga.
        <br>

        • Fake research score generate nahi kiya jayega.

      </div>

      <div
        style="
          margin-top:14px;
          padding:14px;
          border-top:
            1px solid #39424e;
          line-height:1.8;
        "
      >

        <strong>
          Final Summary
        </strong>

        <br>

        Budget:
        ₹${formatMoney(
          budget
        )}

        <br>

        Invested:
        ₹${formatMoney(
          result.totalInvestment
        )}

        <br>

        Balance:
        ₹${formatMoney(
          result.balance
        )}

        <br>

        Selected:
        ${selected.length}
        stocks

      </div>
    `;


    return html;
  }


  // ==========================================================
  // MONITORING UI
  // ==========================================================

  function appendMonitoringToRecommendation() {

    const box =
      document.getElementById(
        "recommendation"
      );

    if (!box) return;


    const monitoring =
      runMonitoring();


    if (
      !monitoring.success
    ) {
      return;
    }


    const relevant =
      monitoring.monitored
        .filter(
          item =>
            item.monthlyRank > 0 ||
            item.status ===
              "IMPROVING"
        )
        .slice(
          0,
          25
        );


    let html = `
      <div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.75;
        "
      >

        <strong>
          📊 Monthly Top-20 Monitoring
        </strong>

        <br>

        Monthly decision stable rahega;
        daily ranking sirf monitoring signal hai.

        <br><br>
    `;


    relevant.forEach(
      function (item) {

        html += `
          <div
            style="
              padding:7px 0;
              border-bottom:
                1px solid #252d38;
            "
          >

            <strong>
              ${escapeHtml(
                item.symbol
              )}
            </strong>

            —
            Monthly Rank:
            ${
              item.monthlyRank > 0
                ? "#" +
                  item.monthlyRank
                : "Candidate"
            }

            —
            Daily Rank:
            #${item.dailyRank}

            —
            <strong>
              ${escapeHtml(
                item.status
              )}
            </strong>

            <br>

            <small>
              ${escapeHtml(
                item.reason
              )}
            </small>

          </div>
        `;
      }
    );


    const warnings =
      portfolioWarnings();


    if (
      warnings.length
    ) {

      html += `
        <div
          style="
            margin-top:12px;
            padding:10px;
            border-radius:8px;
            border:1px solid #39424e;
          "
        >

          <strong>
            ⚠️ Portfolio Risk Review
          </strong>

          <br>
      `;


      warnings.forEach(
        warning => {

          html +=
            `• ${escapeHtml(
              warning
            )}<br>`;
        }
      );


      html +=
        "</div>";
    }


    html += `
      </div>
    `;


    const valuation =
      calculatePortfolioValue();


    html += `
      <div
        style="
          margin-top:14px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.8;
        "
      >

        <strong>
          💰 Investment Tracking
        </strong>

        <br>

        Tracked Invested:
        <strong>
          ₹${formatMoney(
            valuation.invested
          )}
        </strong>

        <br>

        Current Value:
        <strong>
          ₹${formatMoney(
            valuation.currentValue
          )}
        </strong>

        <br>

        Current P/L:
        <strong>
          ${
            valuation.pnl >= 0
              ? "+"
              : ""
          }₹${formatMoney(
            valuation.pnl
          )}
          (
            ${valuation.pnlPercent.toFixed(2)}%
          )
        </strong>

        <br><br>

        <small>
          Note: New recommendations are not automatically
          added to tracked portfolio. Portfolio tracking should
          be updated only after an actual purchase is recorded.
        </small>

      </div>
    `;


    box.innerHTML +=
      html;
  }


  // ==========================================================
  // PUBLIC FUNCTIONS
  // ==========================================================

  window.runPrototypeV5Monitoring =
    runMonitoring;


  window.getPrototypeV5Portfolio =
    function () {

      return {

        portfolio:
          getPortfolio(),

        valuation:
          calculatePortfolioValue(),

        riskWarnings:
          portfolioWarnings()
      };
    };


  window.getPrototypeV5Summary =
    function () {

      const result =
        runMonitoring();


      if (
        !result.success
      ) {
        return result;
      }


      return {

        month:
          result.month,

        monthlyTop20Count:
          result.monthlyTop20.length,

        watchCount:
          result.monitored.filter(
            x =>
              x.status ===
              "WATCH"
          ).length,

        exitReviewCount:
          result.monitored.filter(
            x =>
              x.status ===
              "EXIT REVIEW"
          ).length,

        improvingCount:
          result.monitored.filter(
            x =>
              x.status ===
              "IMPROVING"
          ).length,

        holdCount:
          result.monitored.filter(
            x =>
              x.status ===
              "HOLD"
          ).length,

        portfolio:
          calculatePortfolioValue(),

        riskWarnings:
          portfolioWarnings()
      };
    };


  // ==========================================================
  // STATUS
  // ==========================================================

  function setMarketStatus(
    text,
    className
  ) {

    const status =
      document.getElementById(
        "marketStatus"
      );

    if (!status) return;

    status.textContent =
      text;

    status.className =
      className;
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  function showError(
    message
  ) {

    const box =
      document.getElementById(
        "errorBox"
      );

    if (!box) return;

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

    if (!box) return;

    box.textContent =
      "";

    box.style.display =
      "none";
  }


  // ==========================================================
  // FORMAT
  // ==========================================================

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


  // ==========================================================
  // ESCAPE HTML
  // ==========================================================

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


  // ==========================================================
  // PERIODIC DAILY MONITORING
  // ==========================================================

  setInterval(
    function () {

      try {

        if (
          window.MARKET_DATA &&
          window.MARKET_DATA.success
        ) {

          runMonitoring();

          renderTop20();
        }

      } catch (error) {

        console.error(
          "Periodic monitoring error:",
          error
        );
      }

    },
    5 * 60 * 1000
  );


  // ==========================================================
  // READY
  // ==========================================================

  console.log(
    "Prototype-1 app.js V5.1 loaded successfully."
  );

})();
