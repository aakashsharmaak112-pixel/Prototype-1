// ============================================================
// PROTOTYPE-1 — APP ENGINE V5.3
// MONTHLY TOP-20
// DAILY MONITORING
// PERSISTENT DETERIORATION
// REPLACEMENT CANDIDATE ENGINE
// SMART WHOLE-SHARE ALLOCATION
// INVESTMENT + PORTFOLIO TRACKING
//
// V5.3
// 1. Monthly Top-20 is the investment baseline.
// 2. Daily ranking NEVER overwrites monthly Top-20.
// 3. Single-day movement NEVER causes replacement/exit.
// 4. Outside Top-20 stocks need confirmation before becoming
//    REPLACEMENT CANDIDATES.
// 5. Existing Top-20 stocks need persistent deterioration
//    before EXIT REVIEW.
// 6. Analyze never creates a fake purchase.
// ============================================================

(function () {
  "use strict";

  console.log("Prototype-1 app.js V5.3 loading...");

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

  // Minimum recent weak days before EXIT REVIEW.
  const EXIT_REVIEW_MIN_DAYS = 2;

  // Replacement confirmation.
  const REPLACEMENT_LOOKBACK_DAYS = 3;
  const REPLACEMENT_MIN_DAYS = 2;

  // Candidate must be meaningfully close to / better than
  // the monthly Top-20 member it could replace.
  const REPLACEMENT_MAX_RANK_GAP = 5;

  // Candidate should not merely be #21 once.
  const REPLACEMENT_MAX_DAILY_RANK = 20;

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

      const monthlyStocks =
        monthly.symbols
          .map(
            symbol =>
              ranked.find(
                s =>
                  s.symbol === symbol
              )
          )
          .filter(Boolean);

      let top20 =
        monthlyStocks.slice(
          0,
          TARGET_TOP20
        );

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
                    s.symbol === symbol
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
  // MONTH
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
  // SMART PLAN
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
        balance: budget
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
  // CAN ADD
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
  // CURRENT DAILY TOP 20
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
  // DAILY MONITORING
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
        .
