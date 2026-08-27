/* ============================================================
   PROTOTYPE-1 — APP ENGINE V12 (FULL BUG FIX)
   Monthly Top-20 + Daily Monitoring + Replacement Candidates
   Smart Whole-Share Allocation
   Existing quotes.js / fetchMarketData() flow untouched
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

  const OLD_PORTFOLIO_KEYS = [
    "prototype1_portfolio_v12",
    "prototype1_portfolio_v13",
    "prototype1_portfolio_v7",
    "prototype1_portfolio_v6",
    "prototype1_portfolio_v5"
  ];

  const OLD_MONTHLY_KEYS = [
    "prototype1_monthly_top20_v12",
    "prototype1_monthly_top20_v13",
    "prototype1_monthly_top20_v7",
    "prototype1_monthly_top20_v6",
    "prototype1_monthly_top20_v5"
  ];

  const OLD_DAILY_KEYS = [
    "prototype1_daily_monitoring_v12",
    "prototype1_daily_monitoring_v13",
    "prototype1_daily_monitoring_v7",
    "prototype1_daily_monitoring_v6",
    "prototype1_daily_monitoring_v5"
  ];

  void PORTFOLIO_KEY;
  void OLD_PORTFOLIO_KEYS;

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
     HELPERS
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

    return `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}`;
  }

  function todayKey() {
    const d = new Date();

    return `${d.getFullYear()}-${String(
      d.getMonth() + 1
    ).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
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

      return raw
        ? JSON.parse(raw)
        : fallback;
    } catch {
      return fallback;
    }
  }

  function storageWrite(key, value) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    } catch {
      return false;
    }
  }

  /* =========================
     NIFTY MASTER
  ========================= */

  function findNiftyStock(symbol) {
    const target =
      normalizeSymbol(symbol);

    const master =
      Array.isArray(window.NIFTY_50_STOCKS)
        ? window.NIFTY_50_STOCKS
        : [];

    return master.find(item =>
      normalizeSymbol(
        item.symbol ||
        item.tradingsymbol ||
        item.ticker
      ) === target
    ) || null;
  }

  function inferBusinessGroup(symbol) {
    const s =
      normalizeSymbol(symbol);

    const groups = {
      HDFCBANK: "HDFC Group",
      HDFCLIFE: "HDFC Group",

      ICICIBANK: "ICICI Group",
      ICICIPRULI: "ICICI Group",

      "BAJAJ-AUTO": "Bajaj Group",
      BAJAJFINSV: "Bajaj Group",
      BAJFINANCE: "Bajaj Group",

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
     NORMALIZATION
  ========================= */

  function normalizeStock(stock) {
    stock =
      stock &&
      typeof stock === "object"
        ? stock
        : {};

    /*
      Kotak Neo quotes.js can return:

      symbol
      tradingsymbol
      tradingSymbol
      ticker
      displaySymbol
      display_symbol

      Price can be:

      price
      lastPrice
      last_price
      ltp
      close
      ohlc.close

      Percentage change can be:

      perChange
      per_change
      changePercent
      change_percentage
      pChange
      p_change

      Keep quotes.js untouched and normalize everything here.
    */

    const rawSymbol =
      stock.symbol ||
      stock.tradingsymbol ||
      stock.tradingSymbol ||
      stock.ticker ||
      stock.displaySymbol ||
      stock.display_symbol ||
      stock.name ||
      "";

    const symbol =
      normalizeSymbol(rawSymbol);

    const master =
      findNiftyStock(symbol);

    const rawChange =
      stock.perChange ??
      stock.per_change ??
      stock.changePercent ??
      stock.change_percentage ??
      stock.pChange ??
      stock.p_change ??
      stock.change ??
      0;

    const rawPrice =
      stock.price ??
      stock.lastPrice ??
      stock.last_price ??
      stock.ltp ??
      stock.close ??
      stock.ohlc?.close ??
      0;

    return {
      ...stock,

      symbol,

      name: String(
        stock.name ||
        stock.companyName ||
        stock.company_name ||
        stock.displaySymbol ||
        stock.display_symbol ||
        master?.name ||
        symbol
      ).trim(),

      sector: String(
        stock.sector ||
        stock.industry ||
        master?.sector ||
        "Other"
      ).trim(),

      businessGroup: String(
        stock.businessGroup ||
        stock.business_group ||
        stock.group ||
        stock.parentGroup ||
        master?.businessGroup ||
        inferBusinessGroup(symbol)
      ).trim(),

      price:
        safeNumber(rawPrice),

      change:
        safeNumber(rawChange),

      chartScore:
        safeNumber(
          stock.chartScore ??
          stock.technicalScore
        ),

      fundamentalScore:
        safeNumber(
          stock.fundamentalScore
        ),

      newsScore:
        safeNumber(
          stock.newsScore
        ),

      priority:
        safeNumber(
          stock.priority ??
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

  /* =========================
     MARKET DATA ADAPTER
     Accept existing quotes.js result.

     Possible structures:

     1) Array
     2) { stocks: [...] }
     3) { quotes: [...] }
     4) { data: [...] }
     5) { results: [...] }
     6) { items: [...] }
     7) Nested data/result/payload
     8) Single quote object
  ========================= */

  function extractQuoteRows(source) {
    if (!source) {
      return [];
    }

    if (Array.isArray(source)) {
      return source;
    }

    if (typeof source !== "object") {
      return [];
    }

    const directKeys = [
      "stocks",
      "quotes",
      "data",
      "results",
      "items"
    ];

    for (const key of directKeys) {
      if (Array.isArray(source[key])) {
        return source[key];
      }
    }

    if (
      source.data &&
      typeof source.data === "object"
    ) {
      const nested =
        extractQuoteRows(
          source.data
        );

      if (nested.length) {
        return nested;
      }
    }

    if (
      source.result &&
      typeof source.result === "object"
    ) {
      const nested =
        extractQuoteRows(
          source.result
        );

      if (nested.length) {
        return nested;
      }
    }

    if (
      source.payload &&
      typeof source.payload === "object"
    ) {
      const nested =
        extractQuoteRows(
          source.payload
        );

      if (nested.length) {
        return nested;
      }
    }

    const symbol =
      source.symbol ||
      source.tradingsymbol ||
      source.tradingSymbol ||
      source.ticker ||
      source.displaySymbol ||
      source.display_symbol;

    const price =
      source.price ??
      source.lastPrice ??
      source.last_price ??
      source.ltp ??
      source.close;

    if (
      symbol &&
      price != null
    ) {
      return [source];
    }

    return [];
  }

  function getStocksFromMarketData() {
    const rows =
      extractQuoteRows(
        window.MARKET_DATA
      );

    return rows
      .map(normalizeStock)
      .filter(isValidStock);
  }

  /* =========================
     RANKING
  ========================= */

  function smartRankStocks(stocks) {
    return stocks
      .map(stock => {
        const momentum =
          Math.max(
            -5,
            Math.min(
              5,
              safeNumber(
                stock.chartScore
              )
            )
          );

        const engineScore =
          safeNumber(
            stock.change
          ) +
          momentum * 0.10 +
          safeNumber(
            stock.priority
          ) * 0.001;

        return {
          ...stock,
          momentum,
          engineScore
        };
      })
      .sort(
        (a, b) =>
          b.engineScore -
          a.engineScore
      )
      .map(
        (stock, index) => ({
          ...stock,
          dailyRank:
            index + 1
        })
      );
  }

  /* =========================
     MONTHLY MEMORY
  ========================= */

  function normalizeMonthlyRecord(record) {
    if (
      !record ||
      typeof record !== "object"
    ) {
      return null;
    }

    if (
      !record.month ||
      !Array.isArray(record.symbols)
    ) {
      return null;
    }

    const symbols =
      record.symbols
        .map(normalizeSymbol)
        .filter(Boolean)
        .slice(
          0,
          TARGET_TOP20
        );

    if (
      symbols.length !==
      TARGET_TOP20
    ) {
      return null;
    }

    return {
      month:
        record.month,

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
    const currentMonth =
      currentMonthKey();

    const current =
      normalizeMonthlyRecord(
        storageRead(
          MONTHLY_KEY
        )
      );

    /*
      IMPORTANT:
      Current month's snapshot is locked.
      Daily ranking NEVER overwrites it.
    */

    if (
      current &&
      current.month === currentMonth
    ) {
      return current;
    }

    /*
      Migrate only a matching current-month
      snapshot from older versions.
    */

    for (
      const key of OLD_MONTHLY_KEYS
    ) {
      const old =
        normalizeMonthlyRecord(
          storageRead(key)
        );

      if (
        old &&
        old.month === currentMonth
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
    top20,
    reason =
      "monthly_initialization"
  ) {
    /*
      NEVER overwrite an existing
      current-month snapshot.
    */

    const existing =
      getSavedMonthlyMemory();

    if (existing) {
      return existing;
    }

    const symbols =
      top20
        .slice(
          0,
          TARGET_TOP20
        )
        .map(
          s =>
            normalizeSymbol(
              s.symbol
            )
        )
        .filter(Boolean);

    if (
      symbols.length !==
      TARGET_TOP20
    ) {
      return null;
    }

    const record = {
      month:
        currentMonthKey(),

      symbols,

      createdAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),

      source:
        reason
    };

    storageWrite(
      MONTHLY_KEY,
      record
    );

    return record;
  }

  function ensureMonthlyTop20(
    ranked
  ) {
    const existing =
      getSavedMonthlyMemory();

    if (existing) {
      return existing;
    }

    return saveMonthlyTop20(
      ranked.slice(
        0,
        TARGET_TOP20
      ),
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

    const bySymbol =
      new Map(
        ranked.map(
          stock => [
            normalizeSymbol(
              stock.symbol
            ),
            stock
          ]
        )
      );

    return monthlyMemory.symbols
      .map(
        symbol =>
          bySymbol.get(
            normalizeSymbol(
              symbol
            )
          )
      )
      .filter(Boolean)
      .map(
        (stock, index) => ({
          ...stock,
          monthlyRank:
            index + 1
        })
      );
  }

  /* =========================
     DAILY MONITORING
  ========================= */

  function loadDailyMonitoring() {
    const current =
      storageRead(
        DAILY_KEY
      );

    if (
      current &&
      current.date === todayKey() &&
      current.records &&
      typeof current.records === "object"
    ) {
      return current;
    }

    /*
      Migrate today's monitoring
      from old versions if present.
    */

    for (
      const key of OLD_DAILY_KEYS
    ) {
      const old =
        storageRead(key);

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
      date:
        todayKey(),

      records: {}
    };
  }

  function buildMonitoring(
    ranked,
    monthlyMemory
  ) {
    const monthlySymbols =
      monthlyMemory.symbols
        .map(normalizeSymbol);

    const previous =
      loadDailyMonitoring();

    const records = {};

    ranked.forEach(
      stock => {
        const symbol =
          normalizeSymbol(
            stock.symbol
          );

        const inMonthly =
          monthlySymbols.includes(
            symbol
          );

        let state;

        if (inMonthly) {
          if (
            stock.dailyRank <=
            TARGET_TOP20
          ) {
            state = {
              state: "HOLD",

              reason:
                "Monthly Top-20 mein hai; daily fluctuation normal hai."
            };
          } else if (
            stock.dailyRank <= 30
          ) {
            state = {
              state: "WATCH",

              reason:
                "Monthly Top-20 holding hai, lekin daily ranking weaken hui hai. Automatic exit nahi."
            };
          } else {
            state = {
              state:
                "EXIT REVIEW",

              reason:
                "Monthly Top-20 holding ki daily ranking significantly deteriorate hui hai. Review required."
            };
          }
        } else {
          if (
            stock.dailyRank <=
            TARGET_TOP20
          ) {
            state = {
              state:
                "IMPROVING",

              reason:
                "Current daily Top-20 mein improve hua hai. Next monthly review mein consider kiya jayega."
            };
          } else {
            state = {
              state: "WATCH",

              reason:
                "Current daily ranking monthly investment decision ko automatically change nahi karegi."
            };
          }
        }

        const previousRecord =
          previous.records?.[
            symbol
          ];

        records[symbol] = {
          symbol,

          dailyRank:
            stock.dailyRank,

          monthlyRank:
            monthlySymbols.indexOf(
              symbol
            ) + 1,

          state:
            state.state,

          reason:
            state.reason,

          previousDailyRank:
            previousRecord?.dailyRank ??
            null,

          date:
            todayKey(),

          updatedAt:
            new Date().toISOString()
        };
      }
    );

    const data = {
      date:
        todayKey(),

      month:
        monthlyMemory.month,

      records
    };

    storageWrite(
      DAILY_KEY,
      data
    );

    return data;
  }

  /* =========================
     EXIT / REPLACEMENT
  ========================= */

  function getExitReviewStocks(
    monthlyStocks,
    monitoring
  ) {
    return monthlyStocks.filter(
      stock =>
        monitoring.records?.[
          normalizeSymbol(
            stock.symbol
          )
        ]?.state ===
        "EXIT REVIEW"
    );
  }

  function getFreshInvestmentCandidates(
    monthlyStocks,
    monitoring
  ) {
    return monthlyStocks.filter(
      stock =>
        monitoring.records?.[
          normalizeSymbol(
            stock.symbol
          )
        ]?.state !==
        "EXIT REVIEW"
    );
  }

  function getReplacementCandidates(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    const monthlySet =
      new Set(
        monthlyMemory.symbols.map(
          normalizeSymbol
        )
      );

    return ranked
      .filter(stock => {
        const symbol =
          normalizeSymbol(
            stock.symbol
          );

        return (
          !monthlySet.has(
            symbol
          ) &&
          stock.dailyRank <=
            TARGET_TOP20 &&
          monitoring.records?.[
            symbol
          ]?.state ===
            "IMPROVING"
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

  function calculateTargetWeights(
    stocks
  ) {
    const count =
      stocks.length;

    if (!count) {
      return [];
    }

    const totalWeight =
      (count * (count + 1)) /
      2;

    return stocks.map(
      (stock, index) => {
        const rankWeight =
          count - index;

        return {
          ...stock,

          rankWeight,

          targetPercent:
            rankWeight /
            totalWeight
        };
      }
    );
  }

  function sectorTotal(
    selected,
    sector
  ) {
    return selected
      .filter(
        s =>
          s.sector ===
          sector
      )
      .reduce(
        (
          sum,
          s
        ) =>
          sum +
          safeNumber(
            s.investment
          ),
        0
      );
  }

  function groupTotal(
    selected,
    group
  ) {
    return selected
      .filter(
        s =>
          s.businessGroup ===
          group
      )
      .reduce(
        (
          sum,
          s
        ) =>
          sum +
          safeNumber(
            s.investment
          ),
        0
      );
  }

  function canAdd(
    stock,
    selected,
    budget,
    balance
  ) {
    if (
      !Number.isFinite(
        stock.price
      ) ||
      stock.price <= 0
    ) {
      return false;
    }

    if (
      stock.price >
      balance + 0.0001
    ) {
      return false;
    }

    const existing =
      selected.find(
        s =>
          s.symbol ===
          stock.symbol
      );

    const currentInvestment =
      existing?.investment ||
      0;

    /*
      Small-budget exception:
      first share can be up to 25%
      when budget is below ₹20,000.
    */

    const smallBudgetException =
      budget <
        SMALL_BUDGET_THRESHOLD &&
      currentInvestment === 0 &&
      stock.price <=
        budget *
          SMALL_BUDGET_MAX_STOCK;

    const stockLimit =
      smallBudgetException
        ? SMALL_BUDGET_MAX_STOCK
        : NORMAL_MAX_STOCK;

    const maxStock =
      Math.min(
        HARD_MAX_STOCK,
        stockLimit
      ) * budget;

    if (
      currentInvestment +
        stock.price >
      maxStock + 0.0001
    ) {
      return false;
    }

    if (
      sectorTotal(
        selected,
        stock.sector
      ) +
        stock.price >
      budget *
        MAX_SECTOR_ALLOCATION +
        0.0001
    ) {
      return false;
    }

    if (
      groupTotal(
        selected,
        stock.businessGroup
      ) +
        stock.price >
      budget *
        MAX_GROUP_ALLOCATION +
        0.0001
    ) {
      return false;
    }

    return true;
  }

  function allocationScore(
    stock,
    selected,
    budget,
    balance
  ) {
    const existing =
      selected.find(
        s =>
          s.symbol ===
          stock.symbol
      );

    const current =
      existing?.investment ||
      0;

    const target =
      stock.targetPercent *
      budget;

    const gapScore =
      Math.max(
        0,
        target - current
      ) /
      Math.max(
        budget,
        1
      );

    const rankScore =
      (
        TARGET_TOP20 -
        stock.monthlyRank +
        1
      ) /
      TARGET_TOP20;

    const sectorInvestment =
      sectorTotal(
        selected,
        stock.sector
      );

    const diversification =
      1 -
      Math.min(
        1,
        sectorInvestment /
          (
            budget *
            MAX_SECTOR_ALLOCATION
          )
      );

    const utilization =
      Math.min(
        1,
        stock.price /
          Math.max(
            balance,
            1
          )
      );

    const momentum =
      Math.max(
        -5,
        Math.min(
          5,
          stock.momentum || 0
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

  function countSelected(
    stocks
  ) {
    return stocks.filter(
      s =>
        s.quantity > 0
    ).length;
  }

  function buildSmartPlan(
    stocks,
    budget
  ) {
    const weighted =
      calculateTargetWeights(
        stocks
      );

    const selected =
      weighted.map(
        stock => ({
          ...stock,

          quantity: 0,

          investment: 0
        })
      );

    let balance =
      budget;

    /*
      PASS 1:
      Try to create at least
      five diversified stocks.
    */

    const affordable =
      [...selected]
        .filter(
          s =>
            s.price <=
            budget
        )
        .sort(
          (a, b) =>
            (
              b.rankWeight /
              b.price
            ) -
            (
              a.rankWeight /
              a.price
            )
        );

    for (
      const stock of affordable
    ) {
      if (
        countSelected(
          selected
        ) >=
        Math.min(
          MIN_DIVERSIFIED_STOCKS,
          selected.length
        )
      ) {
        break;
      }

      if (
        canAdd(
          stock,
          selected,
          budget,
          balance
        )
      ) {
        stock.quantity += 1;

        stock.investment =
          stock.quantity *
          stock.price;

        balance -=
          stock.price;
      }
    }

    /*
      PASS 2:
      Whole-share smart allocation.
    */

    let guard = 0;

    while (
      balance > 0 &&
      guard < 20000
    ) {
      guard++;

      const possible =
        selected.filter(
          stock =>
            canAdd(
              stock,
              selected,
              budget,
              balance
            )
        );

      if (
        !possible.length
      ) {
        break;
      }

      possible.sort(
        (a, b) =>
          allocationScore(
            b,
            selected,
            budget,
            balance
          ) -
          allocationScore(
            a,
            selected,
            budget,
            balance
          )
      );

      const best =
        possible[0];

      best.quantity += 1;

      best.investment =
        best.quantity *
        best.price;

      balance -=
        best.price;
    }

    if (
      Math.abs(balance) <
      0.005
    ) {
      balance = 0;
    }

    return {
      budget,

      invested:
        budget -
        balance,

      balance,

      selected,

      selectedCount:
        countSelected(
          selected
        )
    };
  }

  /* =========================
     PORTFOLIO / TRACKING
  ========================= */

  function savePlanAsTrackedPortfolio(
    plan
  ) {
    const positions = {};

    plan.selected
      .filter(
        s =>
          s.quantity > 0
      )
      .forEach(
        stock => {
          positions[
            normalizeSymbol(
              stock.symbol
            )
          ] = {
            symbol:
              normalizeSymbol(
                stock.symbol
              ),

            name:
              stock.name,

            quantity:
              stock.quantity,

            averagePrice:
              stock.price,

            invested:
              stock.investment,

            lastPrice:
              stock.price
          };
        }
      );

    storageWrite(
      PORTFOLIO_KEY,
      {
        budget:
          plan.budget,

        positions,

        updatedAt:
          new Date().toISOString(),

        source:
          "prototype1_v12_analysis"
      }
    );
  }

  function getTrackedPortfolio() {
    return storageRead(
      PORTFOLIO_KEY,
      {
        budget: 0,
        positions: {}
      }
    );
  }

  function calculateTrackedValue() {
    const portfolio =
      getTrackedPortfolio();

    const live =
      new Map(
        getStocksFromMarketData().map(
          s => [
            normalizeSymbol(
              s.symbol
            ),
            s
          ]
        )
      );

    let invested = 0;
    let currentValue = 0;

    Object.values(
      portfolio.positions || {}
    ).forEach(
      pos => {
        const qty =
          safeNumber(
            pos.quantity
          );

        const buyPrice =
          safeNumber(
            pos.averagePrice
          );

        const liveStock =
          live.get(
            normalizeSymbol(
              pos.symbol
            )
          );

        const currentPrice =
          liveStock
            ? safeNumber(
                liveStock.price
              )
            : buyPrice;

        invested +=
          qty *
          buyPrice;

        currentValue +=
          qty *
          currentPrice;
      }
    );

    const pnl =
      currentValue -
      invested;

    return {
      invested,

      currentValue,

      pnl,

      pnlPercent:
        invested > 0
          ? (
              pnl /
              invested
            ) *
            100
          : 0
    };
  }

  /* =========================
     RENDER
  ========================= */

  function renderMonthlyTop20(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    if (!top20List) {
      return;
    }

    const monthlyStocks =
      getMonthlyStocks(
        ranked,
        monthlyMemory
      );

    top20List.innerHTML =
      monthlyStocks
        .map(
          (
            stock,
            index
          ) => {
            const record =
              monitoring.records?.[
                normalizeSymbol(
                  stock.symbol
                )
              ];

            return `
              <div class="top20-item">
                <div>
                  <strong>
                    ${index + 1}
                  </strong>
                  ${escapeHtml(
                    stock.name
                  )}
                </div>

                <div>
                  ${escapeHtml(
                    stock.symbol
                  )}
                  • Monthly #${
                    index + 1
                  }
                  • Daily #${
                    stock.dailyRank
                  }
                </div>

                <div>
                  ${
                    stock.change >= 0
                      ? "+"
                      : ""
                  }${percent(
                    stock.change
                  )}
                  •
                  ${money(
                    stock.price
                  )}
                </div>

                <div>
                  <strong>
                    ${escapeHtml(
                      record?.state ||
                      "HOLD"
                    )}
                  </strong>
                </div>
              </div>
            `;
          }
        )
        .join("");
  }

  function renderWatchlist(
    ranked,
    monthlyMemory
  ) {
    const element =
      document.getElementById(
        "watchlist"
      );

    if (!element) {
      return;
    }

    const monthlySet =
      new Set(
        monthlyMemory.symbols.map(
          normalizeSymbol
        )
      );

    const candidates =
      ranked
        .filter(
          stock =>
            !monthlySet.has(
              normalizeSymbol(
                stock.symbol
              )
            )
        )
        .slice(0, 3);

    element.innerHTML =
      candidates
        .map(
          stock => `
            <div>
              <strong>
                ${escapeHtml(
                  stock.name
                )}
              </strong>

              <span>
                ${escapeHtml(
                  stock.sector
                )}
              </span>

              <b>
                WATCH
              </b>
            </div>
          `
        )
        .join("");
  }

  function renderReplacementCandidates(
    candidates,
    exitReviews
  ) {
    let html =
      `<hr>
       <h3>
         🔄 Replacement Candidates
       </h3>`;

    if (
      exitReviews.length
    ) {
      html += `
        <p>
          <strong>
            EXIT REVIEW:
          </strong>
          ${
            exitReviews
              .map(
                s =>
                  escapeHtml(
                    s.symbol
                  )
              )
              .join(", ")
          }
        </p>
      `;
    }

    if (
      !candidates.length
    ) {
      html += `
        <p>
          Abhi koi valid daily replacement
          candidate available nahi hai.
          Current monthly snapshot maintain rahega.
        </p>
      `;

      return html;
    }

    html += `
      <p>
        Ye stocks current monthly Top-20 mein
        nahi hain, lekin daily ranking mein
        strong improvement dikha rahe hain.
        Inhe next monthly review mein
        consider kiya jayega.
      </p>

      <table>
        <thead>
          <tr>
            <th>Candidate</th>
            <th>Daily Rank</th>
            <th>Change</th>
            <th>Sector</th>
            <th>Status</th>
          </tr>
        </thead>

        <tbody>
    `;

    candidates.forEach(
      stock => {
        html += `
          <tr>
            <td>
              <strong>
                ${escapeHtml(
                  stock.symbol
                )}
              </strong>
              <br>
              ${escapeHtml(
                stock.name
              )}
            </td>

            <td>
              #${stock.dailyRank}
            </td>

            <td>
              ${
                stock.change >= 0
                  ? "+"
                  : ""
              }${percent(
                stock.change
              )}
            </td>

            <td>
              ${escapeHtml(
                stock.sector
              )}
            </td>

            <td>
              <strong>
                IMPROVING
              </strong>
            </td>
          </tr>
        `;
      }
    );

    html += `
        </tbody>
      </table>
    `;

    return html;
  }

  function renderMonitoring(
    ranked,
    monthlyMemory,
    monitoring
  ) {
    const monthlyStocks =
      getMonthlyStocks(
        ranked,
        monthlyMemory
      );

    const exitReviews =
      getExitReviewStocks(
        monthlyStocks,
        monitoring
      );

    let html = `
      <hr>

      <h3>
        📊 Daily Monitoring
      </h3>

      <p>
        Daily monitoring active hai.
        Daily fluctuation se monthly
        investment decision automatically
        change nahi hota.
      </p>

      <p>
        Monthly Snapshot:
        <strong>
          ${escapeHtml(
            monthlyMemory.month
          )}
        </strong>
      </p>
    `;

    if (
      exitReviews.length
    ) {
      html += `
        <div>
          <strong>
            ⚠️ EXIT REVIEW REQUIRED
          </strong>

          <ul>
      `;

      exitReviews.forEach(
        stock => {
          html += `
            <li>
              <strong>
                ${escapeHtml(
                  stock.symbol
                )}
              </strong>
              —
              Monthly #${
                stock.monthlyRank
              }
              —
              Daily #${
                stock.dailyRank
              }
            </li>
          `;
        }
      );

      html += `
          </ul>

          <p>
            Automatic sell execute nahi hua hai.
            Review required hai.
          </p>
        </div>
      `;
    }

    html += `
      <h4>
        Monthly Holdings
      </h4>
    `;

    monthlyStocks.forEach(
      stock => {
        const record =
          monitoring.records?.[
            normalizeSymbol(
              stock.symbol
            )
          ];

        if (!record) {
          return;
        }

        html += `
          <div class="monitor-row">
            <strong>
              ${escapeHtml(
                stock.symbol
              )}
            </strong>

            —
            Monthly #${
              stock.monthlyRank
            }

            —
            Daily #${
              stock.dailyRank
            }

            —
            <b>
              ${escapeHtml(
                record.state
              )}
            </b>

            <br>

            <small>
              ${escapeHtml(
                record.reason
              )}
            </small>
          </div>
        `;
      }
    );

    return html;
  }

  function renderTrackedPortfolio() {
    const valuation =
      calculateTrackedValue();

    return `
      <p>
        Tracked Invested:
        <strong>
          ${money(
            valuation.invested
          )}
        </strong>
      </p>

      <p>
        Current Value:
        <strong>
          ${money(
            valuation.currentValue
          )}
        </strong>
      </p>

      <p>
        Current P/L:
        <strong>
          ${
            valuation.pnl >= 0
              ? "+"
              : ""
          }${money(
            valuation.pnl
          )}
          (
          ${percent(
            valuation.pnlPercent
          )}
          )
        </strong>
      </p>
    `;
  }

  function renderPlan(
    plan,
    decisionStocks
  ) {
    let html = `
      <h3>
        🤖 Prototype-1 V12
      </h3>

      <h4>
        Monthly Top-20 Smart Investment Plan
      </h4>

      <p>
        Budget:
        <strong>
          ${money(
            plan.budget
          )}
        </strong>
      </p>

      <p>
        Decision Mode:
        <strong>
          MONTHLY
        </strong>
      </p>

      <p>
        Daily Monitoring:
        <strong>
          ACTIVE
        </strong>
      </p>

      <p>
        Eligible Monthly Stocks:
        <strong>
          ${decisionStocks.length}
        </strong>
      </p>

      <p>
        Invested:
        <strong>
          ${money(
            plan.invested
          )}
        </strong>
      </p>

      <p>
        Balance:
        <strong>
          ${money(
            plan.balance
          )}
        </strong>
      </p>

      <hr>

      <table>
        <thead>
          <tr>
            <th>
              Decision Rank
            </th>

            <th>
              Company
            </th>

            <th>
              Price
            </th>

            <th>
              Target %
            </th>

            <th>
              Target ₹
            </th>

            <th>
              Shares
            </th>

            <th>
              Actual ₹
            </th>

            <th>
              Actual %
            </th>

            <th>
              Sector
            </th>

            <th>
              Group
            </th>
          </tr>
        </thead>

        <tbody>
    `;

    plan.selected.forEach(
      (
        stock,
        decisionIndex
      ) => {
        const actualPercent =
          plan.invested > 0
            ? (
                stock.investment /
                plan.invested
              ) *
              100
            : 0;

        html += `
          <tr>
            <td>
              #${
                decisionIndex + 1
              }
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  stock.symbol
                )}-EQ
              </strong>

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
                stock.targetPercent *
                  plan.budget
              )}
            </td>

            <td>
              <strong>
                ${stock.quantity}
              </strong>
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

      <hr>

      <h3>
        📌 Selected Stocks
      </h3>

      <ul>
    `;

    plan.selected
      .filter(
        s =>
          s.quantity > 0
      )
      .forEach(
        stock => {
          html += `
            <li>
              <strong>
                ${escapeHtml(
                  stock.symbol
                )}
              </strong>
              —
              ${stock.quantity}
              share(s)
              —
              ${money(
                stock.investment
              )}
            </li>
          `;
        }
      );

    html += `
      </ul>

      <hr>

      <h3>
        🧠 V12 Decision Logic
      </h3>

      <ul>
        <li>
          Monthly Top-20 investment decision
          ka primary reference hai.
        </li>

        <li>
          Daily ranking sirf monitoring signal hai.
        </li>

        <li>
          Daily fluctuation se automatic
          BUY/SELL nahi hoga.
        </li>

        <li>
          Existing monthly memory ko daily
          ranking overwrite nahi karegi.
        </li>

        <li>
          Strong deterioration par
          EXIT REVIEW milega.
        </li>

        <li>
          EXIT REVIEW stock ko fresh
          allocation nahi diya jayega.
        </li>

        <li>
          Improving daily stocks next monthly
          review ke replacement candidates hain.
        </li>

        <li>
          Daily improvement current monthly
          investment decision ko immediately
          replace nahi karega.
        </li>

        <li>
          Whole-share allocation use hota hai.
        </li>

        <li>
          Normal individual-stock limit 20% hai.
        </li>

        <li>
          Small-budget first-share limit 25% hai.
        </li>

        <li>
          Hard stock limit 35% hai.
        </li>

        <li>
          Sector limit 40% hai.
        </li>

        <li>
          Business-group limit 30% hai.
        </li>

        <li>
          Budget exceed nahi hoga.
        </li>

        <li>
          Fake research score generate nahi kiya jayega.
        </li>

        <li>
          Available market data hi use hoga.
        </li>
      </ul>

      <hr>

      <h3>
        📊 Allocation Summary
      </h3>

      <p>
        Selected:
        <strong>
          ${plan.selectedCount}
        </strong>
        stocks
      </p>

      <p>
        Invested:
        <strong>
          ${money(
            plan.invested
          )}
        </strong>
      </p>

      <p>
        Balance:
        <strong>
          ${money(
            plan.balance
          )}
        </strong>
      </p>

      <hr>

      <h3>
        💰 Investment Tracking
      </h3>

      ${renderTrackedPortfolio()}
    `;

    return html;
  }

  function validatePlan(
    plan
  ) {
    const total =
      plan.selected.reduce(
        (
          sum,
          s
        ) =>
          sum +
          safeNumber(
            s.investment
          ),
        0
      );

    if (
      Math.abs(
        total -
          plan.invested
      ) > 0.01
    ) {
      throw new Error(
        "Allocation validation failed: invested total mismatch."
      );
    }

    if (
      plan.invested >
      plan.budget +
        0.01
    ) {
      throw new Error(
        "Allocation validation failed: budget exceeded."
      );
    }

    plan.selected.forEach(
      stock => {
        const pct =
          plan.budget > 0
            ? stock.investment /
              plan.budget
            : 0;

        const maxPct =
          (
            plan.budget <
              SMALL_BUDGET_THRESHOLD &&
            stock.quantity === 1
          )
            ? SMALL_BUDGET_MAX_STOCK
            : NORMAL_MAX_STOCK;

        if (
          pct >
            HARD_MAX_STOCK +
              0.0001 ||
          pct >
            maxPct +
              0.0001
        ) {
          throw new Error(
            `Allocation validation failed: ${stock.symbol} exceeds stock limit.`
          );
        }
      }
    );

    const sectors = {};
    const groups = {};

    plan.selected.forEach(
      stock => {
        sectors[
          stock.sector
        ] =
          (
            sectors[
              stock.sector
            ] || 0
          ) +
          stock.investment;

        groups[
          stock.businessGroup
        ] =
          (
            groups[
              stock.businessGroup
            ] || 0
          ) +
          stock.investment;
      }
    );

    Object.values(
      sectors
    ).forEach(
      v => {
        if (
          v >
          plan.budget *
            MAX_SECTOR_ALLOCATION +
            0.01
        ) {
          throw new Error(
            "Allocation validation failed: sector limit exceeded."
          );
        }
      }
    );

    Object.values(
      groups
    ).forEach(
      v => {
        if (
          v >
          plan.budget *
            MAX_GROUP_ALLOCATION +
            0.01
        ) {
          throw new Error(
            "Allocation validation failed: business-group limit exceeded."
          );
        }
      }
    );
  }

  /* =========================
     ANALYZE
  ========================= */

  async function analyzeInvestmentAmount(
    amount
  ) {
    const budget =
      safeNumber(amount);

    if (
      !Number.isFinite(
        budget
      ) ||
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
      smartRankStocks(
        stocks
      );

    const monthlyMemory =
      ensureMonthlyTop20(
        ranked
      );

    if (
      !monthlyMemory
    ) {
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

    /*
      EXIT REVIEW stocks are explicitly
      excluded from fresh BUY allocation.
    */

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

    validatePlan(
      plan
    );

    savePlanAsTrackedPortfolio(
      plan
    );

    if (
      recommendation
    ) {
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
     DO NOT CHANGE quotes.js FLOW
  ========================= */

  if (
    connectButton
  ) {
    connectButton.addEventListener(
      "click",
      async () => {
        try {
          const totp =
            String(
              totpInput?.value ||
                ""
            ).trim();

          if (
            !/^\d{6}$/.test(
              totp
            )
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

          /*
            IMPORTANT:
            Existing quotes.js flow remains untouched.
          */

          const result =
            await window.fetchMarketData(
              totp
            );

          /*
            fetchMarketData() may return:

            - array
            - {stocks: [...]}
            - boolean while MARKET_DATA is
              populated separately
            - complete API response object
          */

          const resultRows =
            extractQuoteRows(
              result
            );

          const existingRows =
            extractQuoteRows(
              window.MARKET_DATA
            );

          /*
            If the returned result itself
            contains quote rows, use those rows.
          */

          if (
            resultRows.length
          ) {
            window.MARKET_DATA =
              Array.isArray(
                result
              )
                ? result
                : {
                    ...(result &&
                    typeof result ===
                      "object"
                      ? result
                      : {}),

                    stocks:
                      resultRows
                  };
          }

          /*
            If quotes.js returns true/false
            and stores actual rows in
            window.MARKET_DATA, preserve them.
          */

          else if (
            existingRows.length
          ) {
            /*
              Intentionally do nothing.

              Existing MARKET_DATA is already
              the actual live quote source.
            */
          }

          /*
            If result is an object but no rows
            were found, retain raw response
            for diagnostic information.
          */

          else if (
            result &&
            typeof result ===
              "object"
          ) {
            window.MARKET_DATA =
              result;
          }

          const stocks =
            getStocksFromMarketData();

          const apiReceived =
            Number(
              window.MARKET_DATA
                ?.received ??
              window.MARKET_DATA
                ?.totalReceived ??
              stocks.length
            );

          const apiErrors =
            Number(
              window.MARKET_DATA
                ?.totalErrors ??
              (
                Array.isArray(
                  window.MARKET_DATA
                    ?.errors
                )
                  ? window.MARKET_DATA
                      .errors.length
                  : 0
              )
            );

          console.log(
            "Prototype-1 live response:",
            {
              apiReceived,

              apiErrors,

              mappedStocks:
                stocks.length,

              responseType:
                Array.isArray(
                  window.MARKET_DATA
                )
                  ? "array"
                  : typeof window.MARKET_DATA,

              responseKeys:
                window.MARKET_DATA &&
                typeof window.MARKET_DATA ===
                  "object"
                  ? Object.keys(
                      window.MARKET_DATA
                    )
                  : []
            }
          );

          /*
            Minimum requirement:
            at least 20 valid stocks.

            In normal Nifty-50 live operation
            this should be 50/50.
          */

          if (
            stocks.length <
            TARGET_TOP20
          ) {
            throw new Error(
              `Live market data incomplete hai. ${stocks.length}/${TARGET_TOP20} valid stocks received. API received: ${apiReceived}. errors: ${apiErrors}.`
            );
          }

          const ranked =
            smartRankStocks(
              stocks
            );

          /*
            Monthly snapshot is created only
            if there is no current-month snapshot.
            Existing monthly snapshot is locked.
          */

          const monthlyMemory =
            ensureMonthlyTop20(
              ranked
            );

          if (
            !monthlyMemory
          ) {
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

          if (
            status
          ) {
            status.textContent =
              `Live market data connected successfully. ${stocks.length}/50 stocks received.`;
          }

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div>
                <strong>
                  Live Market Data Connected ✅
                </strong>

                <br><br>

                ${stocks.length}/50
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
                <strong>
                  ACTIVE
                </strong>

                <br>

                Monthly Decision Mode:
                <strong>
                  ACTIVE
                </strong>
              </div>

              ${renderMonitoring(
                ranked,
                monthlyMemory,
                monitoring
              )}
            `;
          }
        } catch (
          error
        ) {
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

  if (
    analyzeButton
  ) {
    analyzeButton.addEventListener(
      "click",
      async () => {
        try {
          const amount =
            safeNumber(
              amountInput?.value
            );

          if (
            !Number.isFinite(
              amount
            ) ||
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
        } catch (
          error
        ) {
          console.error(
            "Prototype-1 V12 analyze error:",
            error
          );

          if (
            recommendation
          ) {
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

      if (
        monthlyMemory
      ) {
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
  } catch (
    error
  ) {
    console.warn(
      "Initial Prototype-1 V12 render skipped:",
      error
    );
  }

  console.log(
    "Prototype-1 App Engine V12.1 loaded successfully — live response adapter fixed; quotes.js flow unchanged."
  );
})();
