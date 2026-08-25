/* ============================================================
   PROTOTYPE-1 — APP ENGINE V12
   Monthly Top-20 + Daily Monitoring + Replacement Candidates
   Smart Whole-Share Allocation + Final Validation

   IMPORTANT:
   - quotes.js / fetchMarketData() flow untouched
   - Monthly snapshot daily ranking se overwrite nahi hota
   - Daily rank #1 se start hota hai
   - Investment allocation monthly decision stocks par hoti hai
   - EXIT REVIEW stocks fresh allocation mein nahi aate
   ============================================================ */

(() => {
  "use strict";

  /* =========================
     CONFIG
  ========================= */

  const TARGET_TOP20 = 20;

  const NORMAL_MAX_STOCK = 0.20;
  const SMALL_BUDGET_THRESHOLD = 20000;
  const SMALL_BUDGET_MAX_STOCK = 0.25;
  const HARD_MAX_STOCK = 0.35;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  const MIN_DIVERSIFIED_STOCKS = 5;
  const REPLACEMENT_POOL_SIZE = 5;

  const PORTFOLIO_KEY = "prototype1_portfolio_v12";
  const MONTHLY_KEY = "prototype1_monthly_top20_v12";
  const DAILY_KEY = "prototype1_daily_monitoring_v12";

  const OLD_MONTHLY_KEYS = [
    "prototype1_monthly_top20_v11",
    "prototype1_monthly_top20_v10",
    "prototype1_monthly_top20_v7",
    "prototype1_monthly_top20_v6",
    "prototype1_monthly_top20_v5"
  ];

  const OLD_DAILY_KEYS = [
    "prototype1_daily_monitoring_v11",
    "prototype1_daily_monitoring_v10",
    "prototype1_daily_monitoring_v7",
    "prototype1_daily_monitoring_v6",
    "prototype1_daily_monitoring_v5"
  ];

  /* =========================
     DOM
  ========================= */

  const amountInput = document.getElementById("amount");
  const totpInput = document.getElementById("totp");

  const connectButton = document.getElementById("connectButton");
  const analyzeButton = document.getElementById("analyzeButton");

  const recommendation = document.getElementById("recommendation");
  const top20List = document.getElementById("top20List");

  /* =========================
     BASIC HELPERS
  ========================= */

  function safeNumber(value, fallback = 0) {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }

  function money(value) {
    return "₹" + safeNumber(value).toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  function percent(value) {
    return safeNumber(value).toFixed(2) + "%";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function currentMonthKey() {
    const d = new Date();

    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0")
    );
  }

  function todayKey() {
    const d = new Date();

    return (
      d.getFullYear() +
      "-" +
      String(d.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(d.getDate()).padStart(2, "0")
    );
  }

  function normalizeSymbol(symbol) {
    return String(symbol || "")
      .toUpperCase()
      .replace(/-EQ$/i, "")
      .trim();
  }

  function storageRead(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function storageWrite(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /* =========================
     MASTER STOCK LOOKUP
  ========================= */

  function findNiftyStock(symbol) {
    const target = normalizeSymbol(symbol);

    const master = Array.isArray(window.NIFTY_50_STOCKS)
      ? window.NIFTY_50_STOCKS
      : [];

    return (
      master.find(item => {
        const candidate = normalizeSymbol(
          item.symbol ||
          item.tradingsymbol ||
          item.ticker
        );

        return candidate === target;
      }) || null
    );
  }

  function inferBusinessGroup(symbol) {
    const s = normalizeSymbol(symbol);

    const groups = {
      HDFCBANK: "HDFC Group",
      HDFCLIFE: "HDFC Group",

      ICICIBANK: "ICICI Group",
      ICICIPRULI: "ICICI Group",

      "BAJAJ-AUTO": "Bajaj Group",
      BAJFINANCE: "Bajaj Group",
      BAJAJFINSV: "Bajaj Group",

      RELIANCE: "Reliance Group",

      TATAMOTORS: "Tata Group",
      TATASTEEL: "Tata Group",
      TATACONSUM: "Tata Group",
      TCS: "Tata Group",
      TITAN: "Tata Group",
      TRENT: "Tata Group",

      SBIN: "SBI Group",
      SBILIFE: "SBI Group",

      ADANIENT: "Adani Group",
      ADANIPORTS: "Adani Group",

      LT: "Larsen Group",
      LTIM: "Larsen Group",
      LTTS: "Larsen Group"
    };

    return groups[s] || s;
  }

  /* =========================
     STOCK NORMALIZATION
  ========================= */

  function normalizeStock(stock) {
    const symbol = normalizeSymbol(
      stock?.symbol ||
      stock?.tradingsymbol ||
      stock?.ticker
    );

    const master = findNiftyStock(symbol);

    return {
      ...stock,

      symbol,

      name:
        stock?.name ||
        stock?.companyName ||
        master?.name ||
        symbol,

      sector:
        stock?.sector ||
        master?.sector ||
        "Other",

      businessGroup:
        stock?.businessGroup ||
        stock?.group ||
        master?.businessGroup ||
        inferBusinessGroup(symbol),

      price: safeNumber(
        stock?.price ??
        stock?.lastPrice ??
        stock?.ltp
      ),

      change: safeNumber(
        stock?.change ??
        stock?.changePercent ??
        stock?.pChange
      ),

      chartScore: safeNumber(stock?.chartScore),

      fundamentalScore: safeNumber(
        stock?.fundamentalScore
      ),

      newsScore: safeNumber(
        stock?.newsScore
      ),

      priority: safeNumber(
        stock?.priority ??
        master?.priority
      )
    };
  }

  function isValidStock(stock) {
    return Boolean(
      stock &&
      stock.symbol &&
      Number.isFinite(stock.price) &&
      stock.price > 0 &&
      Number.isFinite(stock.change)
    );
  }

  function getStocksFromMarketData() {
    const data = Array.isArray(window.MARKET_DATA)
      ? window.MARKET_DATA
      : [];

    return data
      .map(normalizeStock)
      .filter(isValidStock);
  }

  /* =========================
     DAILY RANKING
  ========================= */

  function smartRankStocks(stocks) {
    return stocks
      .map(stock => {
        const momentum = Math.max(
          -5,
          Math.min(
            5,
            safeNumber(stock.chartScore)
          )
        );

        const engineScore =
          safeNumber(stock.change) +
          momentum * 0.10 +
          safeNumber(stock.priority) * 0.001;

        return {
          ...stock,
          momentum,
          engineScore
        };
      })
      .sort((a, b) => {
        if (b.engineScore !== a.engineScore) {
          return b.engineScore - a.engineScore;
        }

        if (b.change !== a.change) {
          return b.change - a.change;
        }

        return String(a.symbol).localeCompare(
          String(b.symbol)
        );
      })
      .map((stock, index) => ({
        ...stock,

        /* ALWAYS starts at 1 */
        dailyRank: index + 1
      }));
  }

  /* =========================
     MONTHLY TOP-20 MEMORY
  ========================= */

  function normalizeMonthlyRecord(record) {
    if (
      !record ||
      typeof record !== "object" ||
      !record.month ||
      !Array.isArray(record.symbols)
    ) {
      return null;
    }

    const symbols = record.symbols
      .map(normalizeSymbol)
      .filter(Boolean)
      .slice(0, TARGET_TOP20);

    if (symbols.length !== TARGET_TOP20) {
      return null;
    }

    return {
      month: record.month,
      symbols,

      createdAt:
        record.createdAt ||
        new Date().toISOString(),

      updatedAt:
        record.updatedAt ||
        new Date().toISOString(),

      source:
        record.source ||
        "existing"
    };
  }

  function getSavedMonthlyMemory() {
    const month = currentMonthKey();

    const current = normalizeMonthlyRecord(
      storageRead(MONTHLY_KEY)
    );

    if (
      current &&
      current.month === month
    ) {
      return current;
    }

    for (const key of OLD_MONTHLY_KEYS) {
      const old = normalizeMonthlyRecord(
        storageRead(key)
      );

      if (
        old &&
        old.month === month
      ) {
        const migrated = {
          ...old,

          updatedAt:
            new Date().toISOString(),

          source:
            "migrated_to_v12"
        };

        storageWrite(
          MONTHLY_KEY,
          migrated
        );

        return migrated;
      }
    }

    return null;
  }

  function saveMonthlyTop20(
    ranked,
    reason = "new_month_snapshot"
  ) {
    const existing =
      getSavedMonthlyMemory();

    /*
      IMPORTANT:
      Once current-month snapshot exists,
      NEVER overwrite it with today's ranking.
    */
    if (existing) {
      return existing;
    }

    const symbols = ranked
      .slice(0, TARGET_TOP20)
      .map(stock =>
        normalizeSymbol(stock.symbol)
      )
      .filter(Boolean);

    if (
      symbols.length !== TARGET_TOP20
    ) {
      return null;
    }

    const record = {
      month: currentMonthKey(),
      symbols,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      source: reason
    };

    storageWrite(
      MONTHLY_KEY,
      record
    );

    return record;
  }

  function ensureMonthlyTop20(ranked) {
    const existing =
      getSavedMonthlyMemory();

    if (existing) {
      return existing;
    }

    return saveMonthlyTop20(
      ranked,
      "new_month_snapshot"
    );
  }

  function getMonthlyStocks(
    ranked,
    monthlyMemory
  ) {
    if (!monthlyMemory) {
      return [];
    }

    const bySymbol = new Map(
      ranked.map(stock => [
        normalizeSymbol(stock.symbol),
        stock
      ])
    );

    /*
      Monthly rank is reconstructed from
      saved monthly order.
      It is NOT the current daily rank.
    */
    return monthlyMemory.symbols
      .map(symbol =>
        bySymbol.get(
          normalizeSymbol(symbol)
        )
      )
      .filter(Boolean)
      .map((stock, index) => ({
        ...stock,
        monthlyRank: index + 1
      }));
  }

  /* =========================
     DAILY MONITORING
  ========================= */

  function loadDailyMonitoring() {
    const current =
      storageRead(DAILY_KEY);

    if (
      current &&
      current.date === todayKey() &&
      current.records &&
      typeof current.records === "object"
    ) {
      return current;
    }

    for (const key of OLD_DAILY_KEYS) {
      const old = storageRead(key);

      if (
        old &&
        old.date === todayKey()
      ) {
        const migrated = {
          ...old,
          updatedAt:
            new Date().toISOString()
        };

        storageWrite(
          DAILY_KEY,
          migrated
        );

        return migrated;
      }
    }

    return {
      date: todayKey(),
      records: {}
    };
  }

  function buildMonitoring(
    ranked,
    monthlyMemory
  ) {
    const monthlySymbols =
      monthlyMemory.symbols.map(
        normalizeSymbol
      );

    const records = {};

    ranked.forEach(stock => {
      const symbol =
        normalizeSymbol(stock.symbol);

      const inMonthly =
        monthlySymbols.includes(symbol);

      let state;
      let reason;

      if (inMonthly) {
        if (stock.dailyRank <= TARGET_TOP20) {
          state = "HOLD";

          reason =
            "Monthly Top-20 mein hai; daily fluctuation se automatic exit nahi.";
        } else if (stock.dailyRank <= 30) {
          state = "WATCH";

          reason =
            "Daily ranking Top-20 se bahar hai; automatic exit nahi hoga.";
        } else {
          state = "EXIT REVIEW";

          reason =
            "Monthly Top-20 holding ki daily ranking significantly weak hui hai; detailed review required.";
        }
      } else {
        if (stock.dailyRank <= TARGET_TOP20) {
          state = "IMPROVING";

          reason =
            "Current daily Top-20 mein improve hua hai; next monthly review candidate.";
        } else {
          state = "WATCH";

          reason =
            "Daily ranking Top-20 se bahar hai.";
        }
      }

      records[symbol] = {
        symbol,
        dailyRank: stock.dailyRank,
        state,
        reason,
        updatedAt:
          new Date().toISOString()
      };
    });

    const result = {
      date: todayKey(),
      records,
      updatedAt:
        new Date().toISOString()
    };

    storageWrite(
      DAILY_KEY,
      result
    );

    return result;
  }

  function getMonitoringState(
    monitoring,
    symbol
  ) {
    const key =
      normalizeSymbol(symbol);

    return (
      monitoring?.records?.[key] ||
      null
    );
  }

  /* =========================
     ELIGIBILITY
  ========================= */

  function getExitReviewStocks(
    monthlyStocks,
    monitoring
  ) {
    return monthlyStocks.filter(stock => {
      const state =
        getMonitoringState(
          monitoring,
          stock.symbol
        );

      return (
        state &&
        state.state === "EXIT REVIEW"
      );
    });
  }

  function getFreshInvestmentCandidates(
    monthlyStocks,
    monitoring
  ) {
    return monthlyStocks.filter(stock => {
      const state =
        getMonitoringState(
          monitoring,
          stock.symbol
        );

      /*
        EXIT REVIEW is completely excluded
        from fresh allocation.
      */
      return !(
        state &&
        state.state === "EXIT REVIEW"
      );
    });
  }

  function getReplacementCandidates(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    const monthlySymbols =
      new Set(
        monthlyMemory.symbols.map(
          normalizeSymbol
        )
      );

    return ranked
      .filter(stock => {
        const symbol =
          normalizeSymbol(stock.symbol);

        if (monthlySymbols.has(symbol)) {
          return false;
        }

        const state =
          getMonitoringState(
            monitoring,
            symbol
          );

        return (
          stock.dailyRank <= TARGET_TOP20 &&
          state &&
          state.state === "IMPROVING"
        );
      })
      .slice(
        0,
        REPLACEMENT_POOL_SIZE
      );
  }

  /* =========================
     ALLOCATION
  ========================= */

  function getStockLimitPercent(
    budget,
    quantity
  ) {
    /*
      25% exception:
      only when budget < ₹20,000
      AND this is exactly the first share.
    */
    if (
      budget < SMALL_BUDGET_THRESHOLD &&
      quantity === 1
    ) {
      return SMALL_BUDGET_MAX_STOCK;
    }

    return NORMAL_MAX_STOCK;
  }

  function calculateConcentration(
    selected,
    total
  ) {
    const sectors = {};
    const groups = {};

    selected.forEach(stock => {
      const amount =
        safeNumber(stock.investment);

      sectors[stock.sector] =
        (sectors[stock.sector] || 0) +
        amount;

      groups[stock.businessGroup] =
        (groups[stock.businessGroup] || 0) +
        amount;
    });

    const sectorPercent = {};
    const groupPercent = {};

    Object.keys(sectors).forEach(key => {
      sectorPercent[key] =
        total > 0
          ? sectors[key] / total
          : 0;
    });

    Object.keys(groups).forEach(key => {
      groupPercent[key] =
        total > 0
          ? groups[key] / total
          : 0;
    });

    return {
      sectors,
      groups,
      sectorPercent,
      groupPercent
    };
  }

  function canAddStock(
    stock,
    selected,
    budget,
    balance
  ) {
    if (
      !stock ||
      stock.price <= 0 ||
      stock.price > balance + 0.000001
    ) {
      return false;
    }

    const currentQuantity =
      safeNumber(stock.quantity);

    const nextQuantity =
      currentQuantity + 1;

    const nextInvestment =
      nextQuantity * stock.price;

    const maxStockPercent =
      getStockLimitPercent(
        budget,
        nextQuantity
      );

    const maxStockAmount =
      Math.min(
        HARD_MAX_STOCK,
        maxStockPercent
      ) * budget;

    if (
      nextInvestment >
      maxStockAmount + 0.01
    ) {
      return false;
    }

    const currentSector =
      selected
        .filter(
          s =>
            s.sector === stock.sector
        )
        .reduce(
          (sum, s) =>
            sum + safeNumber(s.investment),
          0
        );

    const currentGroup =
      selected
        .filter(
          s =>
            s.businessGroup ===
            stock.businessGroup
        )
        .reduce(
          (sum, s) =>
            sum + safeNumber(s.investment),
          0
        );

    if (
      currentSector +
      stock.price >
      budget *
        MAX_SECTOR_ALLOCATION +
        0.01
    ) {
      return false;
    }

    if (
      currentGroup +
      stock.price >
      budget *
        MAX_GROUP_ALLOCATION +
        0.01
    ) {
      return false;
    }

    return true;
  }

  function buildSmartPlan(
    stocks,
    budget
  ) {
    const candidates =
      stocks
        .map((stock, index) => ({
          ...stock,

          rankIndex: index,

          /*
            Higher monthly rank gets
            higher weight.
          */
          rankWeight:
            stocks.length - index,

          quantity: 0,
          investment: 0
        }));

    const weightTotal =
      candidates.reduce(
        (sum, stock) =>
          sum + stock.rankWeight,
        0
      );

    candidates.forEach(stock => {
      stock.targetPercent =
        weightTotal > 0
          ? stock.rankWeight /
            weightTotal
          : 0;

      stock.targetAmount =
        budget *
        stock.targetPercent;
    });

    const selected = [];
    let balance = budget;

    /*
      Diversification first:
      try to establish at least 5 positions
      when the budget makes it possible.
    */
    const diversificationCandidates =
      candidates
        .filter(
          stock =>
            stock.price <=
            budget
        )
        .sort((a, b) => {
          const aScore =
            a.rankWeight /
            a.price;

          const bScore =
            b.rankWeight /
            b.price;

          return bScore - aScore;
        });

    for (
      const stock
      of diversificationCandidates
    ) {
      if (
        selected.length >=
        Math.min(
          MIN_DIVERSIFIED_STOCKS,
          candidates.length
        )
      ) {
        break;
      }

      if (
        stock.price <=
        balance
      ) {
        const selectedCopy =
          selected.slice();

        if (
          canAddStock(
            stock,
            selectedCopy,
            budget,
            balance
          )
        ) {
          stock.quantity = 1;
          stock.investment =
            stock.price;

          selected.push(stock);
          balance -= stock.price;
        }
      }
    }

    /*
      Whole-share optimization.
    */
    let guard = 0;

    while (
      balance > 0.01 &&
      guard < 20000
    ) {
      guard++;

      let best = null;
      let bestScore = -Infinity;

      for (
        const stock of candidates
      ) {
        if (
          stock.price >
          balance + 0.000001
        ) {
          continue;
        }

        const selectedIndex =
          selected.findIndex(
            s =>
              s.symbol ===
              stock.symbol
          );

        const current =
          selectedIndex >= 0
            ? selected[selectedIndex]
            : stock;

        const simulated =
          selected.slice();

        if (
          selectedIndex < 0
        ) {
          simulated.push({
            ...stock,
            quantity: 0,
            investment: 0
          });
        }

        const tempIndex =
          simulated.findIndex(
            s =>
              s.symbol ===
              stock.symbol
          );

        simulated[tempIndex] = {
          ...simulated[tempIndex],
          quantity:
            safeNumber(
              simulated[tempIndex].quantity
            ) + 1,
          investment:
            safeNumber(
              simulated[tempIndex].investment
            ) + stock.price
        };

        const fakeStock =
          simulated[tempIndex];

        if (
          !canAddStock(
            fakeStock,
            simulated.filter(
              s =>
                s.symbol !==
                stock.symbol
            ),
            budget,
            balance
          )
        ) {
          continue;
        }

        const currentInvestment =
          safeNumber(
            current.investment
          );

        const gap =
          Math.max(
            0,
            stock.targetAmount -
            currentInvestment
          );

        const gapScore =
          budget > 0
            ? gap / budget
            : 0;

        const rankScore =
          candidates.length > 0
            ? (
                candidates.length -
                stock.rankIndex
              ) /
              candidates.length
            : 0;

        const existingSectorAmount =
          selected
            .filter(
              s =>
                s.sector ===
                stock.sector
            )
            .reduce(
              (sum, s) =>
                sum +
                safeNumber(
                  s.investment
                ),
              0
            );

        const existingGroupAmount =
          selected
            .filter(
              s =>
                s.businessGroup ===
                stock.businessGroup
            )
            .reduce(
              (sum, s) =>
                sum +
                safeNumber(
                  s.investment
                ),
              0
            );

        const diversification =
          (
            1 -
            Math.min(
              1,
              existingSectorAmount /
                Math.max(
                  1,
                  budget *
                    MAX_SECTOR_ALLOCATION
                )
            )
          ) +
          (
            1 -
            Math.min(
              1,
              existingGroupAmount /
                Math.max(
                  1,
                  budget *
                    MAX_GROUP_ALLOCATION
                )
            )
          );

        const utilization =
          budget > 0
            ? stock.price /
              budget
            : 0;

        const momentum =
          safeNumber(
            stock.momentum
          );

        const allocationScore =
          gapScore * 5 +
          rankScore * 2.5 +
          diversification * 1.5 +
          utilization * 1.2 +
          momentum * 0.15;

        if (
          allocationScore >
          bestScore
        ) {
          bestScore =
            allocationScore;

          best = stock;
        }
      }

      if (!best) {
        break;
      }

      const existingIndex =
        selected.findIndex(
          s =>
            s.symbol ===
            best.symbol
        );

      if (
        existingIndex >= 0
      ) {
        selected[existingIndex].quantity += 1;

        selected[existingIndex].investment =
          selected[existingIndex].quantity *
          selected[existingIndex].price;

        balance -=
          selected[existingIndex].price;
      } else {
        best.quantity = 1;
        best.investment =
          best.price;

        selected.push(best);

        balance -=
          best.price;
      }
    }

    const invested =
      selected.reduce(
        (sum, stock) =>
          sum +
          safeNumber(stock.investment),
        0
      );

    /*
      Final numerical cleanup.
    */
    const finalBalance =
      Math.max(
        0,
        budget - invested
      );

    const actualTotal =
      selected.reduce(
        (sum, stock) =>
          sum +
          safeNumber(stock.investment),
        0
      );

    selected.forEach(stock => {
      stock.actualPercent =
        budget > 0
          ? stock.investment /
            budget
          : 0;
    });

    return {
      budget,

      selected,

      selectedCount:
        selected.filter(
          s => s.quantity > 0
        ).length,

      invested:
        actualTotal,

      balance:
        finalBalance,

      concentration:
        calculateConcentration(
          selected,
          budget
        )
    };
  }

  /* =========================
     FINAL VALIDATION
  ========================= */

  function validatePlan(plan) {
    const budget =
      safeNumber(plan.budget);

    const total =
      plan.selected.reduce(
        (sum, stock) =>
          sum +
          safeNumber(
            stock.investment
          ),
        0
      );

    if (
      Math.abs(
        total -
        safeNumber(plan.invested)
      ) > 0.01
    ) {
      throw new Error(
        "Allocation validation failed: invested total mismatch."
      );
    }

    if (
      total >
      budget + 0.01
    ) {
      throw new Error(
        "Allocation validation failed: budget exceeded."
      );
    }

    const sectorTotals = {};
    const groupTotals = {};

    for (
      const stock
      of plan.selected
    ) {
      const quantity =
        safeNumber(
          stock.quantity
        );

      if (
        quantity <= 0
      ) {
        continue;
      }

      const investment =
        safeNumber(
          stock.investment
        );

      const stockPercent =
        budget > 0
          ? investment / budget
          : 0;

      const allowed =
        getStockLimitPercent(
          budget,
          quantity
        );

      /*
        Hard limit ALWAYS applies.
      */
      if (
        stockPercent >
        HARD_MAX_STOCK +
          0.000001
      ) {
        throw new Error(
          `Allocation validation failed: ${stock.symbol} exceeds 35% hard limit.`
        );
      }

      if (
        stockPercent >
        allowed +
          0.000001
      ) {
        throw new Error(
          `Allocation validation failed: ${stock.symbol} exceeds individual stock limit.`
        );
      }

      sectorTotals[
        stock.sector
      ] =
        (sectorTotals[
          stock.sector
        ] || 0) +
        investment;

      groupTotals[
        stock.businessGroup
      ] =
        (groupTotals[
          stock.businessGroup
        ] || 0) +
        investment;
    }

    for (
      const sector
      of Object.keys(
        sectorTotals
      )
    ) {
      if (
        sectorTotals[sector] >
        budget *
          MAX_SECTOR_ALLOCATION +
          0.01
      ) {
        throw new Error(
          `Allocation validation failed: ${sector} sector limit exceeded.`
        );
      }
    }

    for (
      const group
      of Object.keys(
        groupTotals
      )
    ) {
      if (
        groupTotals[group] >
        budget *
          MAX_GROUP_ALLOCATION +
          0.01
      ) {
        throw new Error(
          `Allocation validation failed: ${group} business-group limit exceeded.`
        );
      }
    }

    return true;
  }

  /* =========================
     PORTFOLIO TRACKING
  ========================= */

  function savePlanAsTrackedPortfolio(
    plan
  ) {
    const positions =
      plan.selected
        .filter(
          stock =>
            safeNumber(
              stock.quantity
            ) > 0
        )
        .map(stock => ({
          symbol:
            stock.symbol,

          quantity:
            stock.quantity,

          averagePrice:
            stock.price,

          invested:
            stock.investment,

          currentPrice:
            stock.price,

          currentValue:
            stock.investment,

          updatedAt:
            new Date().toISOString()
        }));

    const tracked = {
      version: "v12",

      updatedAt:
        new Date().toISOString(),

      budget:
        plan.budget,

      invested:
        plan.invested,

      currentValue:
        positions.reduce(
          (sum, p) =>
            sum +
            safeNumber(
              p.currentValue
            ),
          0
        ),

      positions
    };

    storageWrite(
      PORTFOLIO_KEY,
      tracked
    );

    return tracked;
  }

  function getTrackedPortfolio() {
    return storageRead(
      PORTFOLIO_KEY,
      null
    );
  }

  function renderTrackedPortfolio() {
    const portfolio =
      getTrackedPortfolio();

    if (
      !portfolio ||
      !Array.isArray(
        portfolio.positions
      )
    ) {
      return `
        <p>No active tracked portfolio.</p>
      `;
    }

    const invested =
      portfolio.positions.reduce(
        (sum, p) =>
          sum +
          safeNumber(
            p.invested
          ),
        0
      );

    const currentValue =
      portfolio.positions.reduce(
        (sum, p) =>
          sum +
          safeNumber(
            p.currentValue
          ),
        0
      );

    const pnl =
      currentValue -
      invested;

    const pnlPercent =
      invested > 0
        ? pnl / invested * 100
        : 0;

    return `
      <div>
        <strong>Tracked Invested:</strong>
        ${money(invested)}
        <br>

        <strong>Current Value:</strong>
        ${money(currentValue)}
        <br>

        <strong>Current P/L:</strong>
        ${pnl >= 0 ? "+" : ""}
        ${money(pnl)}
        (${percent(pnlPercent)})
      </div>
    `;
  }

  /* =========================
     TOP-20 UI
  ========================= */

  function renderMonthlyTop20(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    if (!top20List) {
      return;
    }

    /*
      IMPORTANT:
      Current Top-20 display is ALWAYS
      daily ranking #1 → #20.
      This fixes the old "starts from 3"
      display problem.
    */

    const dailyTop20 =
      ranked.slice(
        0,
        TARGET_TOP20
      );

    top20List.innerHTML =
      dailyTop20
        .map(
          (stock, index) => `
            <div class="top20-item">
              <div>
                <strong>${index + 1}</strong>
                ${escapeHtml(
                  stock.name
                )}
              </div>

              <div>
                ${escapeHtml(
                  stock.symbol
                )} •
                ${escapeHtml(
                  stock.sector
                )}
              </div>

              <div>
                ${
                  stock.change >= 0
                    ? "+"
                    : ""
                }${percent(
                  stock.change
                )}
              </div>

              <div>
                ${money(
                  stock.price
                )}
              </div>
            </div>
          `
        )
        .join("");

    void monthlyMemory;
    void monitoring;
  }

  /* =========================
     WATCHLIST
  ========================= */

  function renderWatchlist(
    ranked,
    monthlyMemory
  ) {
    const monthlySymbols =
      new Set(
        monthlyMemory.symbols.map(
          normalizeSymbol
        )
      );

    const watch =
      ranked
        .filter(stock => {
          const symbol =
            normalizeSymbol(
              stock.symbol
            );

          return (
            !monthlySymbols.has(
              symbol
            ) &&
            stock.dailyRank >
              TARGET_TOP20
          );
        })
        .slice(0, 3);

    const watchElement =
      document.getElementById(
        "watchlist"
      );

    if (!watchElement) {
      return;
    }

    watchElement.innerHTML =
      watch.length
        ? watch
            .map(
              stock => `
                <div>
                  <strong>${escapeHtml(
                    stock.symbol
                  )}</strong>
                  ${escapeHtml(
                    stock.sector
                  )}
                  <strong>WATCH</strong>
                </div>
              `
            )
            .join("")
        : "<div>No watch candidates.</div>";
  }

  /* =========================
     MONITORING UI
  ========================= */

  function renderMonitoring(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    const monthlySymbols =
      new Set(
        monthlyMemory.symbols.map(
          normalizeSymbol
        )
      );

    let html =
      `<hr><h3>📊 Monthly Top-20 Monitoring</h3>`;

    html += `
      <p>
        Daily monitoring active hai.
        Daily fluctuation se monthly
        investment decision automatically
        change nahi hoga.
      </p>
    `;

    ranked.forEach(stock => {
      const symbol =
        normalizeSymbol(
          stock.symbol
        );

      const state =
        getMonitoringState(
          monitoring,
          symbol
        );

      if (!state) {
        return;
      }

      /*
        Show monthly Top-20 stocks and
        relevant candidates.
      */
      const relevant =
        monthlySymbols.has(symbol) ||
        state.state === "IMPROVING" ||
        state.state === "EXIT REVIEW";

      if (!relevant) {
        return;
      }

      html += `
        <div>
          <strong>${escapeHtml(
            stock.symbol
          )}</strong>
          — Daily Rank #${stock.dailyRank}
          —
          <strong>${escapeHtml(
            state.state
          )}</strong>
          <br>
          ${escapeHtml(
            state.reason
          )}
        </div>
      `;
    });

    return html;
  }

  /* =========================
     REPLACEMENT UI
  ========================= */

  function renderReplacementCandidates(
    candidates,
    exitReviews
  ) {
    let html =
      `<hr><h3>🔄 Replacement Candidates</h3>`;

    if (!candidates.length) {
      html +=
        `<p>No fresh replacement candidate right now.</p>`;
    } else {
      html += "<ul>";

      candidates.forEach(stock => {
        html += `
          <li>
            <strong>${escapeHtml(
              stock.symbol
            )}</strong>
            —
            Daily Rank #${stock.dailyRank}
            —
            IMPROVING
          </li>
        `;
      });

      html += "</ul>";
    }

    if (exitReviews.length) {
      html += `
        <p>
          ⚠️ EXIT REVIEW stocks:
          ${exitReviews
            .map(
              stock =>
                `<strong>${escapeHtml(
                  stock.symbol
                )}</strong>`
            )
            .join(", ")}
        </p>
      `;
    }

    return html;
  }

  /* =========================
     PLAN UI
  ========================= */

  function renderPlan(
    plan,
    decisionStocks
  ) {
    let html = `
      <div>
        <h3>
          🤖 Prototype-1 V12 —
          Monthly Top-20 Smart Investment Plan
        </h3>

        <p>
          Budget:
          <strong>${money(
            plan.budget
          )}</strong>
        </p>

        <p>
          Decision Mode:
          <strong>MONTHLY</strong>
        </p>

        <p>
          Daily Monitoring:
          <strong>ACTIVE</strong>
        </p>

        <p>
          Monthly Decision Stocks:
          <strong>${decisionStocks.length}</strong>
        </p>

        <p>
          Invested:
          <strong>${money(
            plan.invested
          )}</strong>
        </p>

        <p>
          Balance:
          <strong>${money(
            plan.balance
          )}</strong>
        </p>
      </div>

      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Company</th>
              <th>Price</th>
              <th>Target %</th>
              <th>Target ₹</th>
              <th>Shares</th>
              <th>Actual ₹</th>
              <th>Actual %</th>
              <th>Sector</th>
              <th>Group</th>
            </tr>
          </thead>

          <tbody>
    `;

    /*
      FIX:
      Display rank is always sequential
      1, 2, 3... within the decision table.
      We do NOT use monthlyRank directly
      as the visible table sequence.
    */

    plan.selected.forEach(
      (stock, index) => {
        const actualPercent =
          plan.budget > 0
            ? stock.investment /
              plan.budget *
              100
            : 0;

        html += `
          <tr>
            <td>
              <strong>${index + 1}</strong>
            </td>

            <td>
              <strong>${escapeHtml(
                stock.symbol
              )}</strong>
              <br>
              ${escapeHtml(
                stock.name
              )}
            </td>

            <td>
              ${money(
                stock.price
              )}
            </td>

            <td>
              ${percent(
                stock.targetPercent *
                  100
              )}
            </td>

            <td>
              ${money(
                stock.targetAmount
              )}
            </td>

            <td>
              <strong>${stock.quantity}</strong>
            </td>

            <td>
              ${money(
                stock.investment
              )}
            </td>

            <td>
              ${percent(
                actualPercent
              )}
            </td>

            <td>
              ${escapeHtml(
                stock.sector
              )}
            </td>

            <td>
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

      <hr>

      <h3>📌 Selected Stocks</h3>

      <ul>
    `;

    plan.selected
      .filter(
        stock =>
          stock.quantity > 0
      )
      .forEach(stock => {
        html += `
          <li>
            <strong>${escapeHtml(
              stock.symbol
            )}</strong>
            —
            ${stock.quantity}
            share(s)
            —
            ${money(
              stock.investment
            )}
          </li>
        `;
      });

    html += `
      </ul>

      <hr>

      <h3>🧠 V12 Decision Logic</h3>

      <ul>
        <li>
          Monthly Top-20 investment decision
          ka primary reference hai.
        </li>

        <li>
          Daily ranking sirf monitoring signal hai.
        </li>

        <li>
          Daily fluctuation se automatic BUY/SELL
          nahi hoga.
        </li>

        <li>
          Existing monthly snapshot daily ranking
          se overwrite nahi hogi.
        </li>

        <li>
          Strong deterioration par EXIT REVIEW milega.
        </li>

        <li>
          EXIT REVIEW stock fresh allocation
          mein nahi aayega.
        </li>

        <li>
          Daily Top-20 improvement next monthly
          review candidate rahega.
        </li>

        <li>
          Whole-share allocation use hota hai.
        </li>

        <li>
          Normal individual-stock limit:
          <strong>20%</strong>
        </li>

        <li>
          ₹20,000 se kam budget par first-share
          controlled limit:
          <strong>25%</strong>
        </li>

        <li>
          Hard safety limit:
          <strong>35%</strong>
        </li>

        <li>
          Sector limit:
          <strong>40%</strong>
        </li>

        <li>
          Business-group limit:
          <strong>30%</strong>
        </li>

        <li>
          Budget kabhi exceed nahi hoga.
        </li>

        <li>
          Fake research score generate nahi kiya jayega.
        </li>

        <li>
          Available live market data hi use hoga.
        </li>

        <li>
          Stale portfolio positions silently
          carry forward nahi hongi.
        </li>

        <li>
          Final engine validation allocation
          rules ko dobara verify karti hai.
        </li>
      </ul>

      <hr>

      <h3>📊 Final Summary</h3>

      <p>
        Budget:
        <strong>${money(
          plan.budget
        )}</strong>
      </p>

      <p>
        Invested:
        <strong>${money(
          plan.invested
        )}</strong>
      </p>

      <p>
        Balance:
        <strong>${money(
          plan.balance
        )}</strong>
      </p>

      <p>
        Selected:
        <strong>${plan.selectedCount}</strong>
        stocks
      </p>

      <p>
        Normal stock limit:
        <strong>20%</strong>
      </p>

      <p>
        Small-budget first-share limit:
        <strong>25%</strong>
      </p>

      <p>
        Hard safety limit:
        <strong>35%</strong>
      </p>

      <p>
        Sector limit:
        <strong>40%</strong>
      </p>

      <p>
        Group limit:
        <strong>30%</strong>
      </p>

      <hr>

      <h3>💰 Investment Tracking</h3>

      ${renderTrackedPortfolio()}
    `;

    return html;
  }

  /* =========================
     MAIN ANALYSIS
  ========================= */

  async function analyzeInvestmentAmount(
    amount
  ) {
    const budget =
      safeNumber(amount);

    if (
      !Number.isFinite(budget) ||
      budget <= 0
    ) {
      throw new Error(
        "Please valid investment amount enter karein."
      );
    }

    const stocks =
      getStocksFromMarketData();

    if (
      stocks.length <
      TARGET_TOP20
    ) {
      throw new Error(
        `Live market data incomplete hai. ${TARGET_TOP20} se kam valid stocks mile.`
      );
    }

    const ranked =
      smartRankStocks(stocks);

    /*
      Monthly memory is established only
      when the month has no snapshot.
    */
    const monthlyMemory =
      ensureMonthlyTop20(
        ranked
      );

    if (!monthlyMemory) {
      throw new Error(
        "Monthly Top-20 snapshot create nahi ho paya."
      );
    }

    const monitoring =
      buildMonitoring(
        ranked,
        monthlyMemory
      );

    renderMonthlyTop20(
      ranked,
      monthlyMemory,
      monitoring
    );

    renderWatchlist(
      ranked,
      monthlyMemory
    );

    const monthlyList =
      getMonthlyStocks(
        ranked,
        monthlyMemory
      );

    if (
      !monthlyList.length
    ) {
      throw new Error(
        "Current monthly Top-20 stocks live market data mein available nahi hain."
      );
    }

    const exitReviews =
      getExitReviewStocks(
        monthlyList,
        monitoring
      );

    const decisionStocks =
      getFreshInvestmentCandidates(
        monthlyList,
        monitoring
      );

    const replacementCandidates =
      getReplacementCandidates(
        ranked,
        monthlyMemory,
        monitoring
      );

    if (
      !decisionStocks.length
    ) {
      throw new Error(
        "Current monthly Top-20 ke saare eligible stocks EXIT REVIEW mein hain. Fresh investment plan generate nahi kiya gaya."
      );
    }

    const plan =
      buildSmartPlan(
        decisionStocks,
        budget
      );

    if (
      plan.selectedCount === 0
    ) {
      throw new Error(
        "Is investment amount par whole-share allocation se koi valid stock allocate nahi ho paya."
      );
    }

    /*
      FINAL BUG CHECK
    */
    validatePlan(plan);

    /*
      Save only the fresh generated plan.
      Old stale positions are not carried forward.
    */
    savePlanAsTrackedPortfolio(
      plan
    );

    if (recommendation) {
      recommendation.innerHTML =
        renderPlan(
          plan,
          decisionStocks
        ) +

        renderReplacementCandidates(
          replacementCandidates,
          exitReviews
        ) +

        renderMonitoring(
          ranked,
          monthlyMemory,
          monitoring
        );
    }

    return {
      ranked,
      monthlyMemory,
      monitoring,
      monthlyList,
      exitReviews,
      replacementCandidates,
      decisionStocks,
      plan
    };
  }

  window.analyzeInvestmentAmount =
    analyzeInvestmentAmount;

  /* =========================
     CONNECT LIVE MARKET DATA
     IMPORTANT:
     Existing quotes.js flow untouched.
  ========================= */

  if (connectButton) {
    connectButton.addEventListener(
      "click",
      async () => {
        try {
          const totp =
            String(
              totpInput?.value || ""
            ).trim();

          if (
            !/^\d{6}$/.test(totp)
          ) {
            alert(
              "Please current 6-digit Kotak Neo TOTP enter karein."
            );

            return;
          }

          if (
            typeof window.fetchMarketData !==
            "function"
          ) {
            alert(
              "Market data engine load nahi hua. Page refresh karke dobara try karein."
            );

            return;
          }

          connectButton.disabled =
            true;

          const result =
            await window.fetchMarketData(
              totp
            );

          if (
            Array.isArray(result) &&
            result.length
          ) {
            window.MARKET_DATA =
              result;
          }

          const stocks =
            getStocksFromMarketData();

          if (
            stocks.length <
            TARGET_TOP20
          ) {
            throw new Error(
              `Live market data incomplete hai. ${stocks.length}/${TARGET_TOP20} valid stocks received.`
            );
          }

          const ranked =
            smartRankStocks(
              stocks
            );

          const monthlyMemory =
            ensureMonthlyTop20(
              ranked
            );

          if (!monthlyMemory) {
            throw new Error(
              "Monthly Top-20 snapshot create nahi ho paya."
            );
          }

          const monitoring =
            buildMonitoring(
              ranked,
              monthlyMemory
            );

          renderMonthlyTop20(
            ranked,
            monthlyMemory,
            monitoring
          );

          renderWatchlist(
            ranked,
            monthlyMemory
          );

          const status =
            document.getElementById(
              "marketStatus"
            );

          if (status) {
            status.textContent =
              `Live market data connected successfully. ${stocks.length}/${stocks.length} stocks received.`;
          }

          if (recommendation) {
            recommendation.innerHTML = `
              <div>
                <strong>
                  Live Market Data Connected ✅
                </strong>

                <br><br>

                ${stocks.length}/${stocks.length}
                valid stocks received.

                <br><br>

                Monthly Top-20 Memory:
                <strong>
                  ${escapeHtml(
                    monthlyMemory.month
                  )}
                </strong>

                <br>

                Daily Monitoring:
                <strong>ACTIVE</strong>

                <br>

                Monthly Decision Mode:
                <strong>ACTIVE</strong>
              </div>

              ${renderMonitoring(
                ranked,
                monthlyMemory,
                monitoring
              )}
            `;
          }
        } catch (error) {
          console.error(
            "Prototype-1 V12 connect error:",
            error
          );

          alert(
            error?.message ||
            "Live market data connect nahi ho paya."
          );
        } finally {
          connectButton.disabled =
            false;
        }
      }
    );
  }

  /* =========================
     ANALYZE BUTTON
  ========================= */

  if (analyzeButton) {
    analyzeButton.addEventListener(
      "click",
      async () => {
        try {
          const amount =
            safeNumber(
              amountInput?.value
            );

          if (
            !Number.isFinite(amount) ||
            amount <= 0
          ) {
            alert(
              "Please valid investment amount enter karein."
            );

            return;
          }

          const stocks =
            getStocksFromMarketData();

          if (
            stocks.length <
            TARGET_TOP20
          ) {
            alert(
              "Pehle Connect Live Market Data karke live quotes load karein."
            );

            return;
          }

          analyzeButton.disabled =
            true;

          await analyzeInvestmentAmount(
            amount
          );
        } catch (error) {
          console.error(
            "Prototype-1 V12 analyze error:",
            error
          );

          if (recommendation) {
            recommendation.innerHTML = `
              <div>
                <strong>
                  ⚠️ Analysis Error
                </strong>

                <br>

                ${escapeHtml(
                  error?.message ||
                  "Investment analysis failed."
                )}
              </div>
            `;
          }

          alert(
            error?.message ||
            "Investment analysis failed."
          );
        } finally {
          analyzeButton.disabled =
            false;
        }
      }
    );
  }

  /* =========================
     INITIAL UI
  ========================= */

  try {
    const stocks =
      getStocksFromMarketData();

    if (
      stocks.length >=
      TARGET_TOP20
    ) {
      const ranked =
        smartRankStocks(
          stocks
        );

      const monthlyMemory =
        ensureMonthlyTop20(
          ranked
        );

      if (monthlyMemory) {
        const monitoring =
          buildMonitoring(
            ranked,
            monthlyMemory
          );

        renderMonthlyTop20(
          ranked,
          monthlyMemory,
          monitoring
        );

        renderWatchlist(
          ranked,
          monthlyMemory
        );
      }
    }
  } catch (error) {
    console.warn(
      "Initial Prototype-1 V12 render skipped:",
      error
    );
  }

  console.log(
    "Prototype-1 App Engine V12 loaded successfully."
  );
})();
