// ============================================================
// PROTOTYPE-1
// APP ENGINE V4
// MONTHLY TOP-20 + DAILY MONITORING
// PORTFOLIO / INVESTMENT TRACKING
// MOMENTUM + RISK SIGNALS
// EXIT REVIEW / IMPROVING / WATCH
// SMART WHOLE-SHARE ALLOCATION
// SECTOR + BUSINESS GROUP CONTROL
// ============================================================

(function () {
  "use strict";

  console.log("Prototype-1 app.js V4 loading...");

  // ==========================================================
  // CONFIGURATION
  // ==========================================================

  const TARGET_TOP20 = 20;

  const HARD_MAX_STOCK = 0.35;
  const NORMAL_MAX_STOCK = 0.20;
  const SMALL_BUDGET_MAX_STOCK = 0.25;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  const MIN_DIVERSIFIED_STOCKS = 5;

  // Monthly decision:
  // Daily rank is NOT the main decision.
  const MONTHLY_REVIEW_DAYS = 30;

  // Daily monitoring thresholds
  const WATCH_RANK = 20;
  const WARNING_RANK = 25;
  const EXIT_RANK = 30;

  const NEGATIVE_MOMENTUM = -2.0;
  const STRONG_NEGATIVE_MOMENTUM = -4.0;

  const STORAGE_KEY = "prototype1_v4_state";

  let isConnecting = false;

  // ==========================================================
  // DOM READY
  // ==========================================================

  document.addEventListener("DOMContentLoaded", function () {

    const amountInput = document.getElementById("amount");
    const totpInput = document.getElementById("totp");
    const connectButton = document.getElementById("connectButton");
    const analyzeButton = document.getElementById("analyzeButton");
    const recommendation = document.getElementById("recommendation");

    if (
      !amountInput ||
      !totpInput ||
      !connectButton ||
      !analyzeButton ||
      !recommendation
    ) {
      console.error("Prototype-1 required elements not found.");
      return;
    }

    connectButton.addEventListener("click", async function () {

      if (isConnecting) return;

      const totp = String(totpInput.value || "").trim();

      hideError();

      if (!/^\d{6}$/.test(totp)) {
        showError("Please current 6-digit Kotak Neo TOTP enter karein.");
        setMarketStatus("WAITING", "status-pending");
        return;
      }

      if (typeof window.fetchMarketData !== "function") {
        showError(
          "Market data engine load nahi hua. Page refresh karke dobara try karein."
        );
        return;
      }

      isConnecting = true;

      connectButton.disabled = true;
      analyzeButton.disabled = true;
      connectButton.textContent = "Connecting...";

      setMarketStatus("CONNECTING...", "status-pending");

      try {

        const success = await window.fetchMarketData(totp);

        if (!success) {

          const message =
            window.MARKET_DATA &&
            window.MARKET_DATA.error
              ? window.MARKET_DATA.error
              : "Live market data connect nahi ho paya.";

          showError(message);
          setMarketStatus("ERROR", "status-error");
          return;
        }

        const received =
          Number(window.MARKET_DATA.received || 0);

        const requested =
          Number(window.MARKET_DATA.requested || 50);

        setMarketStatus(
          `LIVE • ${received}/${requested}`,
          "status-ready"
        );

        const stocks = getLiveStocks();

        updateMonthlyMonitoring(stocks);

        renderTop20();

        renderMonitoringPanel();

        recommendation.innerHTML =
          `Live market data connected successfully. ${received}/${requested} stocks received.<br><br>` +
          `Monthly Top-20 baseline aur daily monitoring update ho gaya.`;

        console.log(
          `Prototype-1 V4 live data: ${received}/${requested}`
        );

      } catch (error) {

        console.error("Connect error:", error);

        showError(
          error && error.message
            ? error.message
            : "Live market data connect nahi ho paya."
        );

        setMarketStatus("ERROR", "status-error");

      } finally {

        isConnecting = false;

        connectButton.disabled = false;
        analyzeButton.disabled = false;

        connectButton.textContent =
          "Connect Live Market Data";
      }

    });

    analyzeButton.addEventListener("click", function () {

      hideError();

      const amount = Number(amountInput.value);

      if (!Number.isFinite(amount) || amount <= 0) {

        recommendation.innerHTML =
          "Please valid investment amount enter karein.";

        return;
      }

      try {

        const result =
          window.analyzeInvestmentAmount(amount);

        if (result && result.success) {

          recommendation.innerHTML =
            result.html;

        } else {

          recommendation.innerHTML =
            result && result.message
              ? result.message
              : "Investment analysis available nahi hai.";
        }

      } catch (error) {

        console.error("Investment analysis error:", error);

        recommendation.innerHTML =
          "Investment analysis mein error aaya.";
      }

    });

    amountInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        analyzeButton.click();
      }
    });

    totpInput.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        connectButton.click();
      }
    });

    if (
      window.MARKET_DATA &&
      window.MARKET_DATA.success
    ) {

      updateMonthlyMonitoring(getLiveStocks());
      renderTop20();
      renderMonitoringPanel();
    }

  });

  // ==========================================================
  // PUBLIC INVESTMENT ANALYSIS
  // ==========================================================

  window.analyzeInvestmentAmount = function (amount) {

    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {

      return {
        success: false,
        message: "Please valid investment amount enter karein."
      };
    }

    let stocks =
      getLiveStocks()
        .filter(isValidStock);

    if (!stocks.length) {

      return {
        success: false,
        message:
          "Pehle Connect Live Market Data karke live quotes load karein."
      };
    }

    // --------------------------------------------------------
    // IMPORTANT:
    // Daily ranking is used only for monitoring.
    // Monthly baseline remains primary investment decision.
    // --------------------------------------------------------

    const monthlyTop20 =
      getMonthlyDecisionTop20(stocks);

    const top20 =
      monthlyTop20.length
        ? monthlyTop20
        : smartRankStocks(stocks).slice(0, TARGET_TOP20);

    const result =
      buildSmartDiversifiedPlan(
        top20,
        amount
      );

    savePortfolioPlan(
      amount,
      result
    );

    return {

      success: true,

      html:
        buildRecommendationHTML(
          amount,
          top20,
          result
        ),

      selectedStocks:
        result.selected.filter(
          stock => stock.quantity > 0
        ),

      totalInvestment:
        result.totalInvestment,

      balance:
        result.balance,

      top20

    };
  };

  // ==========================================================
  // LIVE STOCKS
  // ==========================================================

  function getLiveStocks() {

    return getStocksFromMarketData()
      .map(normalizeStock)
      .filter(isValidStock);
  }

  function getStocksFromMarketData() {

    const market = window.MARKET_DATA;

    if (!market || !market.stocks) {
      return [];
    }

    if (Array.isArray(market.stocks)) {
      return market.stocks;
    }

    if (typeof market.stocks !== "object") {
      return [];
    }

    const result = [];

    Object.keys(market.stocks).forEach(function (key) {

      const item = market.stocks[key];

      if (!item) return;

      result.push({

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

        // Future data hooks
        chartScore:
          item.chartScore ??
          item.technicalScore ??
          null,

        fundamentalScore:
          item.fundamentalScore ??
          item.fundamentalsScore ??
          null,

        newsScore:
          item.newsScore ??
          null,

        newsSentiment:
          item.newsSentiment ??
          null

      });

    });

    return result;
  }

  // ==========================================================
  // NORMALIZE
  // ==========================================================

  function normalizeStock(stock) {

    stock = stock || {};

    const symbol =
      String(
        stock.symbol ||
        stock.neoSymbol ||
        stock.displaySymbol ||
        ""
      )
      .replace(/-EQ$/i, "")
      .trim()
      .toUpperCase();

    const master =
      findNiftyStock(symbol);

    const name =
      String(
        stock.name ||
        stock.companyName ||
        (master && master.name) ||
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
        (master && master.sector) ||
        "Nifty 50"
      ).trim();

    const businessGroup =
      String(
        stock.businessGroup ||
        stock.group ||
        stock.parentGroup ||
        (master &&
          (
            master.businessGroup ||
            master.group
          )) ||
        inferBusinessGroup(symbol)
      ).trim();

    return {

      symbol,
      name,
      sector,
      businessGroup,
      price,
      change,

      chartScore:
        toNullableNumber(
          stock.chartScore
        ),

      fundamentalScore:
        toNullableNumber(
          stock.fundamentalScore
        ),

      newsScore:
        toNullableNumber(
          stock.newsScore
        ),

      newsSentiment:
        stock.newsSentiment || null

    };
  }

  function toNullableNumber(value) {

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      return null;
    }

    const n = Number(value);

    return Number.isFinite(n) ? n : null;
  }

  // ==========================================================
  // NIFTY MASTER
  // ==========================================================

  function findNiftyStock(symbol) {

    const list =
      Array.isArray(window.NIFTY_50_STOCKS)
        ? window.NIFTY_50_STOCKS
        : [];

    for (let i = 0; i < list.length; i++) {

      const item = list[i];

      const itemSymbol =
        String(item.symbol || "")
          .replace(/-EQ$/i, "")
          .toUpperCase();

      if (itemSymbol === symbol) {
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

      ADANIENT: "Adani Group",
      ADANIPORTS: "Adani Group",

      HDFCBANK: "HDFC Group",
      HDFCLIFE: "HDFC Group",

      ICICIBANK: "ICICI Group",
      ICICIPRULI: "ICICI Group",

      BAJFINANCE: "Bajaj Group",
      BAJAJFINSV: "Bajaj Group",
      BAJAJ_AUTO: "Bajaj Group",

      RELIANCE: "Reliance Group",

      TATAMOTORS: "Tata Group",
      TATASTEEL: "Tata Group",
      TCS: "Tata Group",
      TITAN: "Tata Group",
      TRENT: "Tata Group",

      LT: "Larsen Group",

      SBIN: "SBI Group"
    };

    return groups[symbol] || symbol;
  }

  // ==========================================================
  // VALID
  // ==========================================================

  function isValidStock(stock) {

    return Boolean(
      stock &&
      stock.symbol &&
      Number.isFinite(stock.price) &&
      stock.price > 0 &&
      Number.isFinite(stock.change)
    );
  }

  // ==========================================================
  // DAILY RANKING
  // ==========================================================

  function smartRankStocks(stocks) {

    return stocks
      .map(function (stock) {

        const master =
          findNiftyStock(stock.symbol);

        const liveChange =
          Number(stock.change || 0);

        const momentumScore =
          Math.max(
            -5,
            Math.min(5, liveChange)
          );

        const masterPriority =
          master &&
          Number.isFinite(
            Number(master.priority)
          )
            ? Number(master.priority)
            : 0;

        return {

          ...stock,

          engineScore:
            liveChange +
            momentumScore * 0.10 +
            masterPriority * 0.001
        };

      })
      .sort(function (a, b) {

        return b.engineScore - a.engineScore;
      });
  }

  // ==========================================================
  // MONTHLY MONITORING ENGINE
  // ==========================================================

  function getState() {

    try {

      const raw =
        localStorage.getItem(
          STORAGE_KEY
        );

      if (!raw) {
        return {
          monthlyBaseline: null,
          history: {},
          portfolio: null
        };
      }

      const parsed =
        JSON.parse(raw);

      return {

        monthlyBaseline:
          parsed.monthlyBaseline || null,

        history:
          parsed.history || {},

        portfolio:
          parsed.portfolio || null
      };

    } catch (error) {

      console.error(
        "State load error:",
        error
      );

      return {
        monthlyBaseline: null,
        history: {},
        portfolio: null
      };
    }
  }

  function saveState(state) {

    try {

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
      );

    } catch (error) {

      console.error(
        "State save error:",
        error
      );
    }
  }

  // ----------------------------------------------------------
  // MONTHLY BASELINE
  // ----------------------------------------------------------

  function updateMonthlyMonitoring(stocks) {

    if (!stocks.length) return;

    const state = getState();

    const today =
      new Date();

    const todayKey =
      dateKey(today);

    const currentDaily =
      smartRankStocks(stocks);

    const currentTop20 =
      currentDaily
        .slice(0, TARGET_TOP20);

    // First time = create monthly baseline
    if (
      !state.monthlyBaseline
    ) {

      state.monthlyBaseline = {

        createdAt:
          today.toISOString(),

        reviewDate:
          new Date(
            today.getTime() +
            MONTHLY_REVIEW_DAYS *
            24 *
            60 *
            60 *
            1000
          ).toISOString(),

        symbols:
          currentTop20.map(
            stock => stock.symbol
          ),

        snapshot:
          currentTop20.map(
            createSnapshot
          )
      };
    }

    // Daily history
    state.history[todayKey] = {

      date:
        today.toISOString(),

      stocks:
        currentDaily.map(function (stock, index) {

          return {

            symbol:
              stock.symbol,

            price:
              stock.price,

            change:
              stock.change,

            dailyRank:
              index + 1
          };

        })
    };

    saveState(state);

    return state;
  }

  function getMonthlyDecisionTop20(stocks) {

    const state =
      getState();

    if (
      !state.monthlyBaseline ||
      !Array.isArray(
        state.monthlyBaseline.symbols
      )
    ) {

      updateMonthlyMonitoring(stocks);

      return smartRankStocks(stocks)
        .slice(0, TARGET_TOP20);
    }

    const baselineSymbols =
      state.monthlyBaseline.symbols;

    const liveMap = {};

    stocks.forEach(function (stock) {
      liveMap[stock.symbol] = stock;
    });

    const result = [];

    // --------------------------------------------------------
    // Existing monthly Top-20 remains primary.
    // Current daily rank does NOT immediately replace it.
    // --------------------------------------------------------

    baselineSymbols.forEach(function (symbol) {

      if (
        liveMap[symbol] &&
        result.length < TARGET_TOP20
      ) {

        result.push(
          liveMap[symbol]
        );
      }
    });

    // --------------------------------------------------------
    // Fill missing slots only with current strong candidates.
    // --------------------------------------------------------

    const remaining =
      smartRankStocks(stocks)
        .filter(function (stock) {

          return !result.some(
            item =>
              item.symbol === stock.symbol
          );

        });

    remaining.forEach(function (stock) {

      if (
        result.length <
        TARGET_TOP20
      ) {

        result.push(stock);
      }

    });

    return result.slice(0, TARGET_TOP20);
  }

  // ==========================================================
  // DAILY MONITORING SIGNAL
  // ==========================================================

  function getMonitoringSignal(stock, dailyRank) {

    const state =
      getState();

    const baseline =
      state.monthlyBaseline;

    const wasInTop20 =
      baseline &&
      Array.isArray(baseline.symbols) &&
      baseline.symbols.includes(
        stock.symbol
      );

    let negativeSignals = 0;
    let positiveSignals = 0;

    if (dailyRank > WATCH_RANK) {
      negativeSignals++;
    }

    if (dailyRank > WARNING_RANK) {
      negativeSignals++;
    }

    if (dailyRank > EXIT_RANK) {
      negativeSignals++;
    }

    if (
      stock.change <=
      NEGATIVE_MOMENTUM
    ) {
      negativeSignals++;
    }

    if (
      stock.change <=
      STRONG_NEGATIVE_MOMENTUM
    ) {
      negativeSignals++;
    }

    if (stock.change > 1) {
      positiveSignals++;
    }

    if (
      stock.change > 2
    ) {
      positiveSignals++;
    }

    // --------------------------------------------------------
    // Do NOT issue EXIT merely because daily rank changed.
    // --------------------------------------------------------

    if (
      wasInTop20 &&
      negativeSignals >= 4
    ) {

      return {
        type: "EXIT REVIEW",
        level: "high",
        reason:
          "Multiple negative signals detected. Monthly position ko review karna chahiye."
      };
    }

    if (
      wasInTop20 &&
      negativeSignals >= 2
    ) {

      return {
        type: "WATCH",
        level: "medium",
        reason:
          "Stock mein deterioration ke signals hain. Abhi immediate exit nahi."
      };
    }

    if (
      !wasInTop20 &&
      positiveSignals >= 2
    ) {

      return {
        type: "IMPROVING",
        level: "positive",
        reason:
          "Stock monthly Top-20 ke bahar hai lekin current momentum improve ho raha hai."
      };
    }

    if (
      wasInTop20 &&
      positiveSignals >= 1
    ) {

      return {
        type: "HOLD",
        level: "normal",
        reason:
          "Monthly Top-20 position currently stable/improving."
      };
    }

    return {

      type:
        wasInTop20
          ? "HOLD"
          : "MONITOR",

      level:
        "normal",

      reason:
        wasInTop20
          ? "Daily fluctuation normal hai."
          : "Monthly Top-20 ke bahar hai; monitoring continue rakhein."
    };
  }

  // ==========================================================
  // MONITORING PANEL
  // ==========================================================

  function renderMonitoringPanel() {

    const stocks =
      getLiveStocks();

    if (!stocks.length) return;

    const ranked =
      smartRankStocks(stocks);

    const state =
      getState();

    const baselineSymbols =
      state.monthlyBaseline &&
      Array.isArray(
        state.monthlyBaseline.symbols
      )
        ? state.monthlyBaseline.symbols
        : [];

    const monitored =
      ranked
        .filter(function (stock) {

          return (
            baselineSymbols.includes(
              stock.symbol
            ) ||
            ranked.indexOf(stock) < 25
          );

        })
        .slice(0, 25);

    let html =
      `<div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.7;
        "
      >
        <strong>📡 Monthly Top-20 Monitoring</strong>
        <br>
        Daily rank sirf monitoring signal hai.
        Monthly position ko bina strong deterioration ke
        turant change nahi kiya jayega.
        <br><br>`;

    monitored.forEach(function (stock) {

      const rank =
        ranked.indexOf(stock) + 1;

      const signal =
        getMonitoringSignal(
          stock,
          rank
        );

      const symbol =
        escapeHtml(
          stock.symbol
        );

      html +=
        `<div
          style="
            padding:8px 0;
            border-bottom:1px solid #252d38;
          "
        >
          <strong>${symbol}</strong>
          — Daily Rank #${rank}
          — ${escapeHtml(signal.type)}
          <br>
          <small>
            ${escapeHtml(signal.reason)}
          </small>
        </div>`;
    });

    html +=
      `</div>`;

    const recommendation =
      document.getElementById(
        "recommendation"
      );

    if (!recommendation) return;

    // Monitoring panel only when no analysis is currently shown.
    const old =
      document.getElementById(
        "prototype1-monitoring-panel"
      );

    if (old) {
      old.remove();
    }

    const wrapper =
      document.createElement("div");

    wrapper.id =
      "prototype1-monitoring-panel";

    wrapper.innerHTML =
      html;

    recommendation.parentNode.insertBefore(
      wrapper,
      recommendation
    );
  }

  // ==========================================================
  // PORTFOLIO TRACKING
  // ==========================================================

  function savePortfolioPlan(
    budget,
    result
  ) {

    const state =
      getState();

    const existing =
      state.portfolio || {};

    const holdings =
      result.selected
        .filter(
          stock =>
            stock.quantity > 0
        )
        .map(function (stock) {

          const oldHolding =
            existing.holdings &&
            existing.holdings[stock.symbol]
              ? existing.holdings[stock.symbol]
              : null;

          return {

            symbol:
              stock.symbol,

            name:
              stock.name,

            quantity:
              stock.quantity,

            averagePrice:
              oldHolding &&
              oldHolding.averagePrice
                ? oldHolding.averagePrice
                : stock.price,

            lastPrice:
              stock.price,

            sector:
              stock.sector,

            businessGroup:
              stock.businessGroup
          };
        });

    const holdingMap = {};

    holdings.forEach(function (item) {
      holdingMap[item.symbol] = item;
    });

    state.portfolio = {

      budget:
        Number(budget),

      invested:
        Number(result.totalInvestment),

      balance:
        Number(result.balance),

      updatedAt:
        new Date().toISOString(),

      holdings:
        holdingMap
    };

    saveState(state);
  }

  function calculatePortfolioValue() {

    const state =
      getState();

    if (
      !state.portfolio ||
      !state.portfolio.holdings
    ) {

      return {
        invested: 0,
        currentValue: 0,
        pnl: 0
      };
    }

    const live =
      getLiveStocks();

    const prices = {};

    live.forEach(function (stock) {
      prices[stock.symbol] =
        stock.price;
    });

    let invested = 0;
    let currentValue = 0;

    Object.keys(
      state.portfolio.holdings
    ).forEach(function (symbol) {

      const holding =
        state.portfolio.holdings[symbol];

      const quantity =
        Number(
          holding.quantity || 0
        );

      const avg =
        Number(
          holding.averagePrice || 0
        );

      const current =
        Number(
          prices[symbol] ||
          holding.lastPrice ||
          avg
        );

      invested +=
        quantity * avg;

      currentValue +=
        quantity * current;
    });

    return {

      invested,

      currentValue,

      pnl:
        currentValue -
        invested
    };
  }

  // ==========================================================
  // CHART / FUNDAMENTAL / NEWS SCORE
  // ==========================================================

  function getResearchScore(stock) {

    const chart =
      stock.chartScore;

    const fundamental =
      stock.fundamentalScore;

    const news =
      stock.newsScore;

    let total = 0;
    let count = 0;

    if (chart !== null) {
      total += chart;
      count++;
    }

    if (fundamental !== null) {
      total += fundamental;
      count++;
    }

    if (news !== null) {
      total += news;
      count++;
    }

    return count
      ? total / count
      : null;
  }

  // ==========================================================
  // SMART DIVERSIFICATION PLAN
  // ==========================================================

  function buildSmartDiversifiedPlan(
    stocks,
    budget
  ) {

    const count =
      stocks.length;

    const weights =
      stocks.map(function (stock, index) {

        return {

          symbol:
            stock.symbol,

          rank:
            index + 1,

          weight:
            count - index
        };
      });

    const weightTotal =
      weights.reduce(
        (sum, item) =>
          sum + item.weight,
        0
      );

    const selected =
      stocks.map(function (stock, index) {

        const target =
          weights[index].weight /
          weightTotal;

        return {

          ...stock,

          rank:
            index + 1,

          rankWeight:
            weights[index].weight,

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
      });

    let total = 0;

    let balance =
      budget;

    // --------------------------------------------------------
    // PHASE 1: diversification seeds
    // --------------------------------------------------------

    const candidates =
      selected
        .filter(
          stock =>
            stock.price <= balance
        )
        .sort(function (a, b) {

          return (
            seedScore(
              b,
              selected,
              budget
            ) -
            seedScore(
              a,
              selected,
              budget
            )
          );
        });

    const usedSectors = {};
    const usedGroups = {};

    for (
      let i = 0;
      i < candidates.length;
      i++
    ) {

      if (
        countPositiveStocks(selected) >=
        MIN_DIVERSIFIED_STOCKS
      ) {
        break;
      }

      const stock =
        candidates[i];

      const sector =
        stock.sector || "Nifty 50";

      const group =
        stock.businessGroup ||
        stock.symbol;

      if (
        usedSectors[sector] &&
        usedGroups[group]
      ) {
        continue;
      }

      if (
        !canAddShareV4(
          stock,
          selected,
          budget,
          balance
        )
      ) {
        continue;
      }

      stock.quantity++;
      stock.investment += stock.price;

      total += stock.price;

      balance =
        Math.max(
          0,
          budget - total
        );

      usedSectors[sector] = true;
      usedGroups[group] = true;
    }

    // --------------------------------------------------------
    // PHASE 2: rank + momentum + diversification
    // --------------------------------------------------------

    let guard = 0;

    while (
      balance > 0 &&
      guard < 20000
    ) {

      guard++;

      const candidates2 =
        selected
          .filter(function (stock) {

            return canAddShareV4(
              stock,
              selected,
              budget,
              balance
            );

          })
          .map(function (stock) {

            return {

              stock,

              score:
                allocationScore(
                  stock,
                  selected,
                  budget,
                  balance
                )
            };

          })
          .sort(function (a, b) {

            return b.score - a.score;
          });

      if (!candidates2.length) {
        break;
      }

      let best =
        candidates2[0];

      let bestScore =
        -Infinity;

      candidates2.forEach(function (item) {

        const stock =
          item.stock;

        const utilization =
          stock.price /
          Math.max(balance, 1);

        const combined =
          item.score +
          utilization * 2;

        if (
          combined >
          bestScore
        ) {

          bestScore =
            combined;

          best =
            item;
        }
      });

      if (
        !best ||
        best.stock.price > balance
      ) {
        break;
      }

      best.stock.quantity++;
      best.stock.investment +=
        best.stock.price;

      total +=
        best.stock.price;

      balance =
        Math.max(
          0,
          budget - total
        );
    }

    calculateConcentration(
      selected,
      total
    );

    selected.forEach(function (stock) {

      stock.targetGap =
        stock.targetAmount -
        stock.investment;

    });

    return {

      selected,

      totalInvestment:
        total,

      balance,

      top20Count:
        count,

      sectorTotals:
        getSectorTotals(selected),

      groupTotals:
        getGroupTotals(selected)
    };
  }

  // ==========================================================
  // SAFETY CHECK
  // ==========================================================

  function canAddShareV4(
    stock,
    selected,
    budget,
    balance
  ) {

    if (
      !stock ||
      stock.price <= 0 ||
      stock.price > balance
    ) {
      return false;
    }

    const nextInvestment =
      stock.investment +
      stock.price;

    let stockLimit =
      NORMAL_MAX_STOCK;

    if (
      stock.investment === 0 &&
      stock.price <=
        budget * SMALL_BUDGET_MAX_STOCK
    ) {
      stockLimit =
        SMALL_BUDGET_MAX_STOCK;
    }

    const maxInvestment =
      Math.min(
        budget * HARD_MAX_STOCK,
        budget * stockLimit
      );

    if (
      nextInvestment >
      maxInvestment + 0.000001
    ) {
      return false;
    }

    const sector =
      stock.sector || "Nifty 50";

    const group =
      stock.businessGroup ||
      stock.symbol;

    const sectorTotals =
      getSectorTotals(selected);

    const groupTotals =
      getGroupTotals(selected);

    const nextSector =
      (sectorTotals[sector] || 0) +
      stock.price;

    const nextGroup =
      (groupTotals[group] || 0) +
      stock.price;

    if (
      nextSector >
      budget * MAX_SECTOR_ALLOCATION +
      0.000001
    ) {
      return false;
    }

    if (
      nextGroup >
      budget * MAX_GROUP_ALLOCATION +
      0.000001
    ) {
      return false;
    }

    return true;
  }

  // ==========================================================
  // SEED SCORE
  // ==========================================================

  function seedScore(
    stock,
    selected,
    budget
  ) {

    const rank =
      stock.rankWeight /
      Math.max(
        selected.length,
        1
      );

    const momentum =
      Math.max(
        -2,
        Math.min(
          2,
          stock.change
        )
      );

    const affordability =
      Math.max(
        0,
        1 -
        stock.price /
        Math.max(
          budget,
          1
        )
      );

    const research =
      getResearchScore(stock);

    const researchBonus =
      research === null
        ? 0
        : research * 0.15;

    return (
      rank * 5 +
      momentum * 0.4 +
      affordability * 2 +
      researchBonus
    );
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

    const gapRatio =
      Math.min(
        2,
        gap / target
      );

    const rankPriority =
      stock.rankWeight /
      Math.max(
        selected.length,
        1
      );

    const momentum =
      Math.max(
        -3,
        Math.min(
          3,
          stock.change
        )
      );

    const sector =
      stock.sector ||
      "Nifty 50";

    const group =
      stock.businessGroup ||
      stock.symbol;

    const sectorRatio =
      (
        getSectorTotals(selected)[sector] ||
        0
      ) /
      Math.max(
        budget,
        1
      );

    const groupRatio =
      (
        getGroupTotals(selected)[group] ||
        0
      ) /
      Math.max(
        budget,
        1
      );

    const diversification =
      (1 - sectorRatio) +
      (1 - groupRatio);

    const newStockBonus =
      stock.investment === 0
        ? 1
        : 0;

    const research =
      getResearchScore(stock);

    const researchBonus =
      research === null
        ? 0
        : research * 0.20;

    const utilization =
      stock.price <= balance
        ? stock.price /
          Math.max(
            balance,
            1
          )
        : 0;

    return (

      gapRatio * 5 +

      rankPriority * 2.5 +

      diversification * 1.8 +

      newStockBonus * 1.2 +

      utilization * 1.5 +

      momentum * 0.25 +

      researchBonus
    );
  }

  // ==========================================================
  // CONCENTRATION
  // ==========================================================

  function calculateConcentration(
    stocks,
    total
  ) {

    const sectors =
      getSectorTotals(stocks);

    const groups =
      getGroupTotals(stocks);

    stocks.forEach(function (stock) {

      stock.actualPercent =
        total > 0
          ? stock.investment /
            total *
            100
          : 0;

      const sector =
        stock.sector || "Nifty 50";

      const group =
        stock.businessGroup ||
        stock.symbol;

      stock.sectorPercent =
        total > 0
          ? (
              (sectors[sector] || 0) /
              total
            ) * 100
          : 0;

      stock.groupPercent =
        total > 0
          ? (
              (groups[group] || 0) /
              total
            ) * 100
          : 0;
    });
  }

  function getSectorTotals(stocks) {

    const totals = {};

    stocks.forEach(function (stock) {

      const sector =
        stock.sector || "Nifty 50";

      totals[sector] =
        (totals[sector] || 0) +
        Number(stock.investment || 0);
    });

    return totals;
  }

  function getGroupTotals(stocks) {

    const totals = {};

    stocks.forEach(function (stock) {

      const group =
        stock.businessGroup ||
        stock.symbol;

      totals[group] =
        (totals[group] || 0) +
        Number(stock.investment || 0);
    });

    return totals;
  }

  function countPositiveStocks(stocks) {

    return stocks.filter(
      stock =>
        stock.quantity > 0
    ).length;
  }

  // ==========================================================
  // TOP 20 RENDER
  // ==========================================================

  function renderTop20() {

    const list =
      document.getElementById(
        "top20List"
      );

    if (!list) return;

    const stocks =
      getLiveStocks();

    if (!stocks.length) {

      list.innerHTML =
        '<p class="note">Live market data available nahi hai.</p>';

      return;
    }

    // UI daily ranking can still show current market rank.
    // Investment engine uses monthly baseline.
    const ranked =
      smartRankStocks(stocks)
        .slice(
          0,
          TARGET_TOP20
        );

    const fragment =
      document.createDocumentFragment();

    ranked.forEach(function (stock, index) {

      const row =
        document.createElement("div");

      row.className =
        "stock";

      const left =
        document.createElement("div");

      left.className =
        "stock-left";

      const rank =
        document.createElement("div");

      rank.className =
        "rank";

      rank.textContent =
        String(index + 1);

      const info =
        document.createElement("div");

      const name =
        document.createElement("div");

      name.className =
        "stock-name";

      name.textContent =
        stock.name;

      const sector =
        document.createElement("div");

      sector.className =
        "stock-sector";

      sector.textContent =
        `${stock.symbol} • ${stock.sector}`;

      info.appendChild(name);
      info.appendChild(sector);

      left.appendChild(rank);
      left.appendChild(info);

      const right =
        document.createElement("div");

      right.className =
        "stock-change";

      const change =
        document.createElement("div");

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
        document.createElement("div");

      price.textContent =
        `₹${formatMoney(stock.price)}`;

      right.appendChild(change);
      right.appendChild(price);

      row.appendChild(left);
      row.appendChild(right);

      fragment.appendChild(row);
    });

    list.replaceChildren(
      fragment
    );
  }

  // ==========================================================
  // RECOMMENDATION HTML
  // ==========================================================

  function buildRecommendationHTML(
    budget,
    top20,
    result
  ) {

    const selectedStocks =
      result.selected.filter(
        stock =>
          stock.quantity > 0
      );

    const portfolio =
      calculatePortfolioValue();

    let html = "";

    html +=
      `<div
        style="
          padding:14px;
          margin-bottom:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.8;
        "
      >

        <strong>
          🤖 Prototype-1 V4
        </strong>

        <br>

        <strong>
          Monthly Top-20 Smart Investment Plan
        </strong>

        <br><br>

        Budget:
        <strong>
          ₹${formatMoney(budget)}
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

        Top-20 Companies:
        <strong>
          ${top20.length}
        </strong>

        <br>

        Invested:
        <strong>
          ₹${formatMoney(result.totalInvestment)}
        </strong>

        <br>

        Balance:
        <strong>
          ₹${formatMoney(result.balance)}
        </strong>

      </div>`;

    // --------------------------------------------------------
    // PORTFOLIO
    // --------------------------------------------------------

    html +=
      `<div
        style="
          padding:14px;
          margin-bottom:14px;
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
          ₹${formatMoney(portfolio.invested)}
        </strong>

        <br>

        Current Value:
        <strong>
          ₹${formatMoney(portfolio.currentValue)}
        </strong>

        <br>

        Current P/L:
        <strong
          class="${
            portfolio.pnl >= 0
              ? "positive"
              : "negative"
          }"
        >
          ₹${formatMoney(portfolio.pnl)}
        </strong>

      </div>`;

    // --------------------------------------------------------
    // TABLE
    // --------------------------------------------------------

    html +=
      `<div
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
      <tr>`;

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
    ].forEach(function (header) {

      html +=
        `<th
          style="
            text-align:left;
            padding:9px;
            border-bottom:1px solid #39424e;
          "
        >
          ${header}
        </th>`;
    });

    html +=
      `</tr>
      </thead>
      <tbody>`;

    result.selected.forEach(function (stock) {

      html +=
        `<tr
          style="
            opacity:
              ${stock.quantity > 0 ? "1" : "0.65"};
          "
        >

        <td style="padding:8px;">
          ${stock.rank}
        </td>

        <td style="padding:8px;">
          <strong>
            ${escapeHtml(stock.name)}
          </strong>
          <br>
          <small>
            ${escapeHtml(stock.symbol)}
          </small>
        </td>

        <td style="padding:8px;">
          ₹${formatMoney(stock.price)}
        </td>

        <td style="padding:8px;">
          ${stock.targetPercent.toFixed(2)}%
        </td>

        <td style="padding:8px;">
          ₹${formatMoney(stock.targetAmount)}
        </td>

        <td style="padding:8px;">
          <strong>
            ${stock.quantity}
          </strong>
        </td>

        <td style="padding:8px;">
          ₹${formatMoney(stock.investment)}
        </td>

        <td style="padding:8px;">
          ${stock.actualPercent.toFixed(2)}%
        </td>

        <td style="padding:8px;">
          ${escapeHtml(stock.sector)}
        </td>

        <td style="padding:8px;">
          ${escapeHtml(stock.businessGroup)}
        </td>

        </tr>`;
    });

    html +=
      `</tbody>
      </table>
      </div>`;

    // --------------------------------------------------------
    // SELECTED STOCKS
    // --------------------------------------------------------

    html +=
      `<div
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
      <br>`;

    if (selectedStocks.length) {

      selectedStocks.forEach(function (stock) {

        html +=
          `• ${escapeHtml(stock.symbol)}
          — ${stock.quantity} share(s)
          — ₹${formatMoney(stock.investment)}
          <br>`;
      });

    } else {

      html +=
        `Current safety rules ke andar
        koi stock allocate nahi ho paya.<br>`;
    }

    html +=
      `</div>`;

    // --------------------------------------------------------
    // LOGIC
    // --------------------------------------------------------

    html +=
      `<div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.7;
        "
      >

      <strong>
        🧠 V4 Decision Logic
      </strong>

      <br>

      • Monthly Top-20 investment decision ka
      primary reference hai.

      <br>

      • Daily rank fluctuation se automatic
      BUY/SELL nahi hoga.

      <br>

      • Daily monitoring continuously chalegi.

      <br>

      • Top-20 se bahar jaane ki possibility par
      WATCH signal milega.

      <br>

      • Multiple negative signals milne par
      <strong>EXIT REVIEW</strong> alert milega.

      <br>

      • Improving stock ko
      <strong>IMPROVING</strong> signal milega.

      <br>

      • Chart/technical score,
      fundamental score aur news score available
      hone par decision mein include honge.

      <br>

      • Whole-share allocation use hota hai.

      <br>

      • Individual stock normal limit
      <strong>20%</strong>.

      <br>

      • Small budget first-share controlled limit
      <strong>25%</strong>.

      <br>

      • Sector limit
      <strong>40%</strong>.

      <br>

      • Business-group limit
      <strong>30%</strong>.

      <br>

      • Budget kabhi exceed nahi hoga.

      <br>

      • Investment aur portfolio value local
      tracking mein maintain ki jayegi.

      </div>`;

    html +=
      `<div
        style="
          margin-top:14px;
          font-size:12px;
          opacity:0.8;
        "
      >
        Prototype-1 AI analysis based on available data.
        Investment ka final decision aapka hai.
      </div>`;

    return html;
  }

  // ==========================================================
  // UTILITY
  // ==========================================================

  function createSnapshot(stock) {

    return {

      symbol:
        stock.symbol,

      price:
        stock.price,

      change:
        stock.change,

      capturedAt:
        new Date().toISOString()
    };
  }

  function dateKey(date) {

    return [
      date.getFullYear(),
      String(
        date.getMonth() + 1
      ).padStart(2, "0"),
      String(
        date.getDate()
      ).padStart(2, "0")
    ].join("-");
  }

  function setMarketStatus(
    text,
    className
  ) {

    const marketStatus =
      document.getElementById(
        "marketStatus"
      );

    if (!marketStatus) return;

    marketStatus.textContent =
      text;

    marketStatus.className =
      className;
  }

  function showError(message) {

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

  function escapeHtml(value) {

    return String(
      value || ""
    )
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // ==========================================================
  // OPTIONAL PUBLIC API
  // Future backend/chart/fundamental/news modules can call these
  // ==========================================================

  window.Prototype1V4 = {

    getLiveStocks,

    getMonthlyDecisionTop20,

    getMonitoringSignal,

    getPortfolioValue:
      calculatePortfolioValue,

    getState,

    resetMonthlyBaseline: function () {

      const state =
        getState();

      state.monthlyBaseline =
        null;

      saveState(state);

      console.log(
        "Prototype-1 monthly baseline reset."
      );
    },

    clearPortfolio: function () {

      const state =
        getState();

      state.portfolio =
        null;

      saveState(state);

      console.log(
        "Prototype-1 portfolio cleared."
      );
    }
  };

  console.log(
    "Prototype-1 app.js V4 loaded successfully."
  );

})();
