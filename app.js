/* ============================================================
   PROTOTYPE-1 — APP ENGINE V13
   ============================================================
   MONTHLY TOP-20
   DAILY MONITORING
   EXIT REVIEW
   REPLACEMENT CANDIDATES
   SMART WHOLE-SHARE ALLOCATION
   PORTFOLIO TRACKING
   LIVE P/L UPDATE
   FINAL VALIDATION
   MODERN DASHBOARD UI

   IMPORTANT:
   - quotes.js untouched
   - fetchMarketData(totp) flow untouched
   - Monthly snapshot current month mein overwrite nahi hota
   - Daily ranking always #1 -> #50
   - Current Top-20 always daily #1 -> #20
   - Investment decision monthly snapshot se hota hai
   - EXIT REVIEW stocks fresh allocation mein nahi aate
   - Budget kabhi exceed nahi hota
   ============================================================ */

(() => {
  "use strict";

  /* ============================================================
     CONFIG
  ============================================================ */

  const TARGET_TOP20 = 20;
  const MIN_DIVERSIFIED_STOCKS = 5;
  const REPLACEMENT_POOL_SIZE = 5;

  const NORMAL_MAX_STOCK = 0.20;

  const SMALL_BUDGET_THRESHOLD = 20000;
  const SMALL_BUDGET_MAX_STOCK = 0.25;

  const HARD_MAX_STOCK = 0.35;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;

  const PORTFOLIO_KEY = "prototype1_portfolio_v13";
  const MONTHLY_KEY = "prototype1_monthly_top20_v13";
  const DAILY_KEY = "prototype1_daily_monitoring_v13";

  const OLD_MONTHLY_KEYS = [
    "prototype1_monthly_top20_v12",
    "prototype1_monthly_top20_v11",
    "prototype1_monthly_top20_v10",
    "prototype1_monthly_top20_v7",
    "prototype1_monthly_top20_v6",
    "prototype1_monthly_top20_v5"
  ];

  const OLD_DAILY_KEYS = [
    "prototype1_daily_monitoring_v12",
    "prototype1_daily_monitoring_v11",
    "prototype1_daily_monitoring_v10",
    "prototype1_daily_monitoring_v7",
    "prototype1_daily_monitoring_v6",
    "prototype1_daily_monitoring_v5"
  ];

  const OLD_PORTFOLIO_KEYS = [
    "prototype1_portfolio_v12",
    "prototype1_portfolio_v11",
    "prototype1_portfolio_v10",
    "prototype1_portfolio_v7",
    "prototype1_portfolio_v6",
    "prototype1_portfolio_v5"
  ];

  /* ============================================================
     DOM
  ============================================================ */

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

  const top20List =
    document.getElementById("top20List");

  const marketStatus =
    document.getElementById("marketStatus");

  /* ============================================================
     BASIC HELPERS
  ============================================================ */

  function safeNumber(value, fallback = 0) {
    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : fallback;
  }

  function money(value) {
    return (
      "₹" +
      safeNumber(value).toLocaleString(
        "en-IN",
        {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      )
    );
  }

  function percent(value) {
    return (
      safeNumber(value).toFixed(2) +
      "%"
    );
  }

  function signedPercent(value) {
    const n = safeNumber(value);

    return (
      (n >= 0 ? "+" : "") +
      n.toFixed(2) +
      "%"
    );
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeSymbol(symbol) {
    return String(symbol || "")
      .toUpperCase()
      .replace(/-EQ$/i, "")
      .trim();
  }

  function currentMonthKey() {
    const d = new Date();

    return (
      d.getFullYear() +
      "-" +
      String(
        d.getMonth() + 1
      ).padStart(2, "0")
    );
  }

  function todayKey() {
    const d = new Date();

    return (
      d.getFullYear() +
      "-" +
      String(
        d.getMonth() + 1
      ).padStart(2, "0") +
      "-" +
      String(
        d.getDate()
      ).padStart(2, "0")
    );
  }

  function nowISO() {
    return new Date().toISOString();
  }

  function storageRead(
    key,
    fallback = null
  ) {
    try {
      const raw =
        localStorage.getItem(key);

      if (!raw) {
        return fallback;
      }

      return JSON.parse(raw);
    } catch (error) {
      console.warn(
        "Storage read failed:",
        key,
        error
      );

      return fallback;
    }
  }

  function storageWrite(
    key,
    value
  ) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify(value)
      );

      return true;
    } catch (error) {
      console.warn(
        "Storage write failed:",
        key,
        error
      );

      return false;
    }
  }

  /* ============================================================
     MODERN UI STYLE
     ============================================================ */

  function injectStyles() {
    if (
      document.getElementById(
        "prototype1-v13-style"
      )
    ) {
      return;
    }

    const style =
      document.createElement("style");

    style.id =
      "prototype1-v13-style";

    style.textContent = `
      #recommendation,
      #top20List {
        font-family:
          Inter,
          system-ui,
          -apple-system,
          BlinkMacSystemFont,
          "Segoe UI",
          sans-serif;
      }

      .p1-dashboard {
        display:grid;
        gap:18px;
        margin-top:18px;
      }

      .p1-hero {
        padding:24px;
        border-radius:24px;
        background:
          linear-gradient(
            135deg,
            #111827,
            #1f2937
          );
        color:#fff;
        box-shadow:
          0 18px 45px rgba(0,0,0,.18);
      }

      .p1-hero h2 {
        margin:0 0 7px;
        font-size:24px;
      }

      .p1-hero p {
        margin:0;
        opacity:.82;
      }

      .p1-grid {
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(145px,1fr)
          );
        gap:12px;
      }

      .p1-card {
        padding:18px;
        border-radius:18px;
        background:#fff;
        border:1px solid
          rgba(0,0,0,.07);
        box-shadow:
          0 8px 24px rgba(0,0,0,.07);
      }

      .p1-card-label {
        font-size:12px;
        color:#6b7280;
        margin-bottom:7px;
      }

      .p1-card-value {
        font-size:21px;
        font-weight:800;
        color:#111827;
      }

      .p1-section {
        background:#fff;
        border-radius:20px;
        padding:20px;
        border:1px solid
          rgba(0,0,0,.07);
        box-shadow:
          0 8px 25px rgba(0,0,0,.06);
      }

      .p1-section h3 {
        margin-top:0;
        color:#111827;
      }

      .p1-top-row {
        display:grid;
        grid-template-columns:
          42px 1fr auto;
        gap:12px;
        align-items:center;
        padding:13px 0;
        border-bottom:
          1px solid #f0f0f0;
      }

      .p1-rank {
        width:34px;
        height:34px;
        display:flex;
        align-items:center;
        justify-content:center;
        border-radius:50%;
        background:#f3f4f6;
        font-weight:800;
      }

      .p1-stock-name {
        font-weight:800;
        color:#111827;
      }

      .p1-stock-meta {
        margin-top:3px;
        font-size:12px;
        color:#6b7280;
      }

      .p1-price {
        text-align:right;
        font-weight:800;
      }

      .p1-positive {
        color:#059669;
      }

      .p1-negative {
        color:#dc2626;
      }

      .p1-pill {
        display:inline-flex;
        align-items:center;
        padding:5px 10px;
        border-radius:999px;
        font-size:11px;
        font-weight:800;
        letter-spacing:.3px;
        background:#f3f4f6;
      }

      .p1-pill.hold {
        background:#ecfdf5;
        color:#047857;
      }

      .p1-pill.watch {
        background:#fffbeb;
        color:#b45309;
      }

      .p1-pill.improving {
        background:#eff6ff;
        color:#1d4ed8;
      }

      .p1-pill.exit {
        background:#fef2f2;
        color:#b91c1c;
      }

      .p1-table-wrap {
        overflow-x:auto;
        border-radius:14px;
        border:1px solid #eee;
      }

      .p1-table {
        width:100%;
        min-width:850px;
        border-collapse:collapse;
        font-size:13px;
      }

      .p1-table th {
        background:#f8fafc;
        color:#475569;
        font-size:11px;
        text-transform:uppercase;
        letter-spacing:.4px;
        padding:12px;
        text-align:left;
        white-space:nowrap;
      }

      .p1-table td {
        padding:13px 12px;
        border-top:1px solid #f1f5f9;
        vertical-align:top;
      }

      .p1-table tr:hover {
        background:#fafafa;
      }

      .p1-selected {
        display:grid;
        grid-template-columns:
          repeat(
            auto-fit,
            minmax(210px,1fr)
          );
        gap:10px;
      }

      .p1-selected-card {
        padding:14px;
        border-radius:15px;
        background:#f8fafc;
        border:1px solid #e5e7eb;
      }

      .p1-monitor-row {
        padding:13px 0;
        border-bottom:1px solid #eee;
      }

      .p1-monitor-title {
        display:flex;
        justify-content:space-between;
        gap:10px;
        align-items:center;
        flex-wrap:wrap;
      }

      .p1-small {
        font-size:12px;
        color:#6b7280;
      }

      .p1-alert {
        padding:14px;
        border-radius:14px;
        background:#fff7ed;
        border:1px solid #fed7aa;
        margin-bottom:10px;
      }

      .p1-success {
        padding:14px;
        border-radius:14px;
        background:#ecfdf5;
        border:1px solid #a7f3d0;
      }

      .p1-danger {
        padding:14px;
        border-radius:14px;
        background:#fef2f2;
        border:1px solid #fecaca;
      }

      .p1-empty {
        padding:18px;
        color:#6b7280;
        text-align:center;
      }

      .p1-footer-note {
        font-size:11px;
        color:#6b7280;
        text-align:center;
        padding:12px;
      }

      @media(max-width:600px) {
        .p1-hero {
          padding:19px;
          border-radius:19px;
        }

        .p1-section {
          padding:15px;
          border-radius:16px;
        }

        .p1-top-row {
          grid-template-columns:
            36px 1fr;
        }

        .p1-price {
          grid-column:2;
          text-align:left;
        }
      }
    `;

    document.head.appendChild(style);
  }

  injectStyles();

  /* ============================================================
     MASTER NIFTY LOOKUP
  ============================================================ */

  function findNiftyStock(symbol) {
    const target =
      normalizeSymbol(symbol);

    const master =
      Array.isArray(
        window.NIFTY_50_STOCKS
      )
        ? window.NIFTY_50_STOCKS
        : [];

    return (
      master.find(item => {
        const candidate =
          normalizeSymbol(
            item?.symbol ||
            item?.tradingsymbol ||
            item?.ticker
          );

        return candidate === target;
      }) || null
    );
  }

  function inferBusinessGroup(
    symbol
  ) {
    const s =
      normalizeSymbol(symbol);

    const groups = {
      HDFCBANK: "HDFC Group",
      HDFCLIFE: "HDFC Group",

      ICICIBANK: "ICICI Group",
      ICICIPRULI: "ICICI Group",

      "BAJAJ-AUTO": "Bajaj Group",
      BAJFINANCE: "Bajaj Group",
      BAJAJFINSV: "Bajaj Group",

      RELIANCE: "Reliance Group",

      TCS: "Tata Group",
      TATAMOTORS: "Tata Group",
      TATASTEEL: "Tata Group",
      TATACONSUM: "Tata Group",
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

  /* ============================================================
     NORMALIZATION
  ============================================================ */

  function normalizeStock(stock) {
    const symbol =
      normalizeSymbol(
        stock?.symbol ||
        stock?.tradingsymbol ||
        stock?.ticker
      );

    const master =
      findNiftyStock(symbol);

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

      price:
        safeNumber(
          stock?.price ??
          stock?.lastPrice ??
          stock?.ltp
        ),

      change:
        safeNumber(
          stock?.change ??
          stock?.changePercent ??
          stock?.pChange
        ),

      chartScore:
        safeNumber(
          stock?.chartScore
        ),

      fundamentalScore:
        safeNumber(
          stock?.fundamentalScore
        ),

      newsScore:
        safeNumber(
          stock?.newsScore
        ),

      priority:
        safeNumber(
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
    const data =
      Array.isArray(
        window.MARKET_DATA
      )
        ? window.MARKET_DATA
        : [];

    const unique =
      new Map();

    data
      .map(normalizeStock)
      .filter(isValidStock)
      .forEach(stock => {
        unique.set(
          normalizeSymbol(
            stock.symbol
          ),
          stock
        );
      });

    return Array.from(
      unique.values()
    );
  }

  /* ============================================================
     DAILY RANKING
  ============================================================ */

  function smartRankStocks(
    stocks
  ) {
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

        /*
          No fake research score.
          Only available live data + existing
          master priority is used.
        */
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
      .sort((a, b) => {
        if (
          b.engineScore !==
          a.engineScore
        ) {
          return (
            b.engineScore -
            a.engineScore
          );
        }

        if (
          b.change !==
          a.change
        ) {
          return (
            b.change -
            a.change
          );
        }

        return String(
          a.symbol
        ).localeCompare(
          String(b.symbol)
        );
      })
      .map(
        (stock, index) => ({
          ...stock,

          /*
            FINAL FIX:
            Ranking ALWAYS begins at 1.
          */
          dailyRank:
            index + 1
        })
      );
  }

  /* ============================================================
     MONTHLY MEMORY
  ============================================================ */

  function normalizeMonthlyRecord(
    record
  ) {
    if (
      !record ||
      typeof record !==
        "object"
    ) {
      return null;
    }

    if (
      !record.month ||
      !Array.isArray(
        record.symbols
      )
    ) {
      return null;
    }

    const symbols = Array.from(
      new Set(
        record.symbols
          .map(
            normalizeSymbol
          )
          .filter(Boolean)
      )
    ).slice(
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
        String(record.month),

      symbols,

      createdAt:
        record.createdAt ||
        nowISO(),

      updatedAt:
        record.updatedAt ||
        nowISO(),

      source:
        record.source ||
        "existing"
    };
  }

  function getSavedMonthlyMemory() {
    const month =
      currentMonthKey();

    const current =
      normalizeMonthlyRecord(
        storageRead(
          MONTHLY_KEY
        )
      );

    if (
      current &&
      current.month === month
    ) {
      return current;
    }

    /*
      Migrate an old current-month
      snapshot exactly once.
    */
    for (
      const oldKey of
      OLD_MONTHLY_KEYS
    ) {
      const old =
        normalizeMonthlyRecord(
          storageRead(
            oldKey
          )
        );

      if (
        old &&
        old.month === month
      ) {
        const migrated = {
          ...old,

          updatedAt:
            nowISO(),

          source:
            "migrated_to_v13"
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

  function createMonthlySnapshot(
    ranked
  ) {
    const current =
      getSavedMonthlyMemory();

    /*
      NEVER overwrite current month.
    */
    if (current) {
      return current;
    }

    if (
      !Array.isArray(ranked) ||
      ranked.length <
        TARGET_TOP20
    ) {
      return null;
    }

    const symbols =
      ranked
        .slice(
          0,
          TARGET_TOP20
        )
        .map(stock =>
          normalizeSymbol(
            stock.symbol
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
        nowISO(),

      updatedAt:
        nowISO(),

      source:
        "new_month_snapshot"
    };

    if (
      !storageWrite(
        MONTHLY_KEY,
        record
      )
    ) {
      throw new Error(
        "Monthly Top-20 memory save nahi ho payi."
      );
    }

    return record;
  }

  function ensureMonthlyTop20(
    ranked
  ) {
    return (
      getSavedMonthlyMemory() ||
      createMonthlySnapshot(
        ranked
      )
    );
  }

  function getMonthlyStocks(
    ranked,
    monthlyMemory
  ) {
    if (
      !monthlyMemory ||
      !Array.isArray(
        monthlyMemory.symbols
      )
    ) {
      return [];
    }

    const liveMap =
      new Map();

    ranked.forEach(stock => {
      liveMap.set(
        normalizeSymbol(
          stock.symbol
        ),
        stock
      );
    });

    /*
      Monthly order is preserved.
      Live price/change comes from
      current market data.
    */
    return monthlyMemory.symbols
      .map(
        (
          symbol,
          index
        ) => {
          const live =
            liveMap.get(
              normalizeSymbol(
                symbol
              )
            );

          if (!live) {
            return null;
          }

          return {
            ...live,

            monthlyRank:
              index + 1
          };
        }
      )
      .filter(Boolean);
  }

  /* ============================================================
     DAILY MONITORING
  ============================================================ */

  function loadDailyMonitoring() {
    const current =
      storageRead(
        DAILY_KEY
      );

    if (
      current &&
      current.date ===
        todayKey() &&
      current.records &&
      typeof current.records ===
        "object"
    ) {
      return current;
    }

    for (
      const oldKey of
      OLD_DAILY_KEYS
    ) {
      const old =
        storageRead(
          oldKey
        );

      if (
        old &&
        old.date ===
          todayKey() &&
        old.records
      ) {
        const migrated = {
          ...old,

          updatedAt:
            nowISO()
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

      records: {},

      updatedAt:
        nowISO()
    };
  }

  function buildMonitoring(
    ranked,
    monthlyMemory
  ) {
    const previous =
      loadDailyMonitoring();

    const monthlySet =
      new Set(
        monthlyMemory.symbols.map(
          normalizeSymbol
        )
      );

    const records = {};

    ranked.forEach(stock => {
      const symbol =
        normalizeSymbol(
          stock.symbol
        );

      const inMonthly =
        monthlySet.has(
          symbol
        );

      let state =
        "WATCH";

      let reason =
        "Daily ranking monitoring only.";

      if (inMonthly) {
        /*
          IMPORTANT:
          Do not use one-day rank movement
          as an automatic sell signal.
        */
        if (
          stock.dailyRank <=
          TARGET_TOP20
        ) {
          state =
            "HOLD";

          reason =
            "Monthly Top-20 mein hai; daily fluctuation se automatic exit nahi.";
        } else if (
          stock.dailyRank <=
          30
        ) {
          state =
            "WATCH";

          reason =
            "Daily ranking Top-20 se bahar hai; automatic exit nahi hoga.";
        } else {
          state =
            "EXIT REVIEW";

          reason =
            "Monthly Top-20 holding ki daily ranking significantly weak hui hai; detailed review required.";
        }
      } else {
        if (
          stock.dailyRank <=
          TARGET_TOP20
        ) {
          state =
            "IMPROVING";

          reason =
            "Current daily Top-20 mein improve hua hai; next monthly review candidate.";
        } else {
          state =
            "WATCH";

          reason =
            "Daily ranking Top-20 se bahar hai.";
        }
      }

      const old =
        previous?.records?.[
          symbol
        ];

      records[symbol] = {
        symbol,

        dailyRank:
          stock.dailyRank,

        state,

        reason,

        previousState:
          old?.state ||
          null,

        previousRank:
          safeNumber(
            old?.dailyRank,
            0
          ),

        updatedAt:
          nowISO()
      };
    });

    const result = {
      date:
        todayKey(),

      records,

      updatedAt:
        nowISO()
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
    return (
      monitoring?.records?.[
        normalizeSymbol(
          symbol
        )
      ] || null
    );
  }

  /* ============================================================
     ELIGIBILITY
  ============================================================ */

  function getExitReviewStocks(
    monthlyStocks,
    monitoring
  ) {
    return monthlyStocks.filter(
      stock => {
        const state =
          getMonitoringState(
            monitoring,
            stock.symbol
          );

        return (
          state?.state ===
          "EXIT REVIEW"
        );
      }
    );
  }

  function getFreshInvestmentCandidates(
    monthlyStocks,
    monitoring
  ) {
    return monthlyStocks.filter(
      stock => {
        const state =
          getMonitoringState(
            monitoring,
            stock.symbol
          );

        return (
          state?.state !==
          "EXIT REVIEW"
        );
      }
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

        if (
          monthlySet.has(symbol)
        ) {
          return false;
        }

        const state =
          getMonitoringState(
            monitoring,
            symbol
          );

        return (
          stock.dailyRank <=
            TARGET_TOP20 &&
          state?.state ===
            "IMPROVING"
        );
      })
      .slice(
        0,
        REPLACEMENT_POOL_SIZE
      );
  }

  /* ============================================================
     ALLOCATION HELPERS
  ============================================================ */

  function getStockLimitPercent(
    budget,
    quantity
  ) {
    /*
      Small budget exception:
      only a FIRST share can use 25%.
      Otherwise normal 20% limit applies.

      Hard 35% safety limit is checked separately.
    */
    if (
      budget <
        SMALL_BUDGET_THRESHOLD &&
      quantity === 1
    ) {
      return SMALL_BUDGET_MAX_STOCK;
    }

    return NORMAL_MAX_STOCK;
  }

  function getSelectedAmount(
    selected,
    symbol
  ) {
    const target =
      normalizeSymbol(
        symbol
      );

    return selected
      .filter(
        stock =>
          normalizeSymbol(
            stock.symbol
          ) === target
      )
      .reduce(
        (sum, stock) =>
          sum +
          safeNumber(
            stock.investment
          ),
        0
      );
  }

  function getSectorAmount(
    selected,
    sector
  ) {
    return selected
      .filter(
        stock =>
          stock.sector ===
          sector
      )
      .reduce(
        (sum, stock) =>
          sum +
          safeNumber(
            stock.investment
          ),
        0
      );
  }

  function getGroupAmount(
    selected,
    group
  ) {
    return selected
      .filter(
        stock =>
          stock.businessGroup ===
          group
      )
      .reduce(
        (sum, stock) =>
          sum +
          safeNumber(
            stock.investment
          ),
        0
      );
  }

  function canAddStock(
    stock,
    selected,
    budget,
    balance
  ) {
    const price =
      safeNumber(
        stock?.price
      );

    if (
      price <= 0 ||
      price >
        balance + 0.000001
    ) {
      return false;
    }

    const currentAmount =
      getSelectedAmount(
        selected,
        stock.symbol
      );

    const currentQuantity =
      price > 0
        ? Math.floor(
            currentAmount /
              price +
              0.000001
          )
        : 0;

    const nextQuantity =
      currentQuantity + 1;

    const nextInvestment =
      currentAmount +
      price;

    /*
      Individual stock limit.
    */
    const allowedPercent =
      getStockLimitPercent(
        budget,
        nextQuantity
      );

    const allowedAmount =
      Math.min(
        HARD_MAX_STOCK,
        allowedPercent
      ) * budget;

    if (
      nextInvestment >
      allowedAmount +
        0.01
    ) {
      return false;
    }

    /*
      Sector limit.
    */
    const nextSector =
      getSectorAmount(
        selected,
        stock.sector
      ) + price;

    if (
      nextSector >
      budget *
        MAX_SECTOR_ALLOCATION +
        0.01
    ) {
      return false;
    }

    /*
      Business-group limit.
    */
    const nextGroup =
      getGroupAmount(
        selected,
        stock.businessGroup
      ) + price;

    if (
      nextGroup >
      budget *
        MAX_GROUP_ALLOCATION +
        0.01
    ) {
      return false;
    }

    return true;
  }

  function calculateConcentration(
    selected,
    budget
  ) {
    const sectors = {};
    const groups = {};

    selected.forEach(stock => {
      const amount =
        safeNumber(
          stock.investment
        );

      sectors[
        stock.sector
      ] =
        (
          sectors[
            stock.sector
          ] || 0
        ) + amount;

      groups[
        stock.businessGroup
      ] =
        (
          groups[
            stock.businessGroup
          ] || 0
        ) + amount;
    });

    const sectorPercent = {};
    const groupPercent = {};

    Object.keys(
      sectors
    ).forEach(key => {
      sectorPercent[key] =
        budget > 0
          ? sectors[key] /
            budget
          : 0;
    });

    Object.keys(
      groups
    ).forEach(key => {
      groupPercent[key] =
        budget > 0
          ? groups[key] /
            budget
          : 0;
    });

    return {
      sectors,
      groups,
      sectorPercent,
      groupPercent
    };
  }

  /* ============================================================
     SMART WHOLE SHARE PLAN
  ============================================================ */

  function buildSmartPlan(
    stocks,
    budget
  ) {
    const candidates =
      stocks.map(
        (stock, index) => ({
          ...stock,

          rankIndex:
            index,

          rankWeight:
            stocks.length -
            index,

          targetPercent: 0,

          targetAmount: 0,

          quantity: 0,

          investment: 0
        })
      );

    const weightTotal =
      candidates.reduce(
        (sum, stock) =>
          sum +
          stock.rankWeight,
        0
      );

    candidates.forEach(
      stock => {
        stock.targetPercent =
          weightTotal > 0
            ? stock.rankWeight /
              weightTotal
            : 0;

        stock.targetAmount =
          budget *
          stock.targetPercent;
      }
    );

    const selected = [];

    let balance =
      budget;

    /*
      ==========================================================
      PASS 1 — DIVERSIFICATION
      ==========================================================
    */

    const diversification =
      candidates
        .filter(
          stock =>
            stock.price <=
            budget
        )
        .sort(
          (a, b) => {
            const aScore =
              a.rankWeight /
              Math.max(
                1,
                a.price
              );

            const bScore =
              b.rankWeight /
              Math.max(
                1,
                b.price
              );

            return (
              bScore -
              aScore
            );
          }
        );

    for (
      const stock of
      diversification
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
        canAddStock(
          stock,
          selected,
          budget,
          balance
        )
      ) {
        stock.quantity = 1;

        stock.investment =
          stock.price;

        selected.push(
          stock
        );

        balance -=
          stock.price;
      }
    }

    /*
      ==========================================================
      PASS 2 — WHOLE SHARE OPTIMIZATION
      ==========================================================
    */

    let guard = 0;

    while (
      balance >
        0.01 &&
      guard <
        20000
    ) {
      guard++;

      let best =
        null;

      let bestScore =
        -Infinity;

      for (
        const stock of
        candidates
      ) {
        if (
          stock.price >
          balance +
            0.000001
        ) {
          continue;
        }

        const currentAmount =
          getSelectedAmount(
            selected,
            stock.symbol
          );

        const gap =
          Math.max(
            0,
            stock.targetAmount -
              currentAmount
          );

        const gapScore =
          budget > 0
            ? gap / budget
            : 0;

        const rankScore =
          candidates.length >
          0
            ? (
                candidates.length -
                stock.rankIndex
              ) /
              candidates.length
            : 0;

        const sectorAmount =
          getSectorAmount(
            selected,
            stock.sector
          );

        const groupAmount =
          getGroupAmount(
            selected,
            stock.businessGroup
          );

        const sectorRoom =
          1 -
          Math.min(
            1,
            sectorAmount /
              Math.max(
                1,
                budget *
                  MAX_SECTOR_ALLOCATION
              )
          );

        const groupRoom =
          1 -
          Math.min(
            1,
            groupAmount /
              Math.max(
                1,
                budget *
                  MAX_GROUP_ALLOCATION
              )
          );

        const diversificationScore =
          sectorRoom +
          groupRoom;

        const utilizationScore =
          budget > 0
            ? Math.min(
                1,
                stock.price /
                  budget
              )
            : 0;

        const momentumScore =
          Math.max(
            -5,
            Math.min(
              5,
              safeNumber(
                stock.momentum
              )
            )
          );

        /*
          Simulate adding exactly one share
          before accepting it.
        */
        const simulated =
          selected.map(
            item => ({
              ...item
            })
          );

        const simulatedIndex =
          simulated.findIndex(
            item =>
              normalizeSymbol(
                item.symbol
              ) ===
              normalizeSymbol(
                stock.symbol
              )
          );

        if (
          simulatedIndex >= 0
        ) {
          simulated[
            simulatedIndex
          ].quantity += 1;

          simulated[
            simulatedIndex
          ].investment +=
            stock.price;
        } else {
          simulated.push({
            ...stock,

            quantity: 1,

            investment:
              stock.price
          });
        }

        const simulatedSelected =
          simulated.filter(
            item =>
              normalizeSymbol(
                item.symbol
              ) !==
              normalizeSymbol(
                stock.symbol
              )
          );

        const simulatedStock =
          simulated.find(
            item =>
              normalizeSymbol(
                item.symbol
              ) ===
              normalizeSymbol(
                stock.symbol
              )
          );

        if (
          !canAddStock(
            simulatedStock,
            simulatedSelected,
            budget,
            balance
          )
        ) {
          continue;
        }

        /*
          Smaller leftover is useful,
          but rank/diversification remain
          more important.
        */
        const utilizationBonus =
          utilizationScore *
          1.2;

        const allocationScore =
          gapScore * 5 +
          rankScore * 2.5 +
          diversificationScore *
            1.5 +
          utilizationBonus +
          momentumScore *
            0.15;

        if (
          allocationScore >
          bestScore
        ) {
          bestScore =
            allocationScore;

          best =
            stock;
        }
      }

      if (!best) {
        break;
      }

      const existingIndex =
        selected.findIndex(
          item =>
            normalizeSymbol(
              item.symbol
            ) ===
            normalizeSymbol(
              best.symbol
            )
        );

      if (
        existingIndex >= 0
      ) {
        selected[
          existingIndex
        ].quantity += 1;

        selected[
          existingIndex
        ].investment =
          selected[
            existingIndex
          ].quantity *
          selected[
            existingIndex
          ].price;
      } else {
        best.quantity = 1;

        best.investment =
          best.price;

        selected.push(
          best
        );
      }

      balance -=
        best.price;

      /*
        Floating-point protection.
      */
      if (
        Math.abs(balance) <
        0.000001
      ) {
        balance = 0;
      }
    }

    const invested =
      selected.reduce(
        (sum, stock) =>
          sum +
          safeNumber(
            stock.investment
          ),
        0
      );

    balance =
      Math.max(
        0,
        budget - invested
      );

    selected.forEach(
      stock => {
        stock.actualPercent =
          budget > 0
            ? stock.investment /
              budget
            : 0;
      }
    );

    return {
      budget,

      selected,

      selectedCount:
        selected.filter(
          stock =>
            safeNumber(
              stock.quantity
            ) > 0
        ).length,

      invested,

      balance,

      concentration:
        calculateConcentration(
          selected,
          budget
        )
    };
  }

  /* ============================================================
     FINAL VALIDATION
  ============================================================ */

  function validatePlan(
    plan
  ) {
    const budget =
      safeNumber(
        plan.budget
      );

    const total =
      plan.selected.reduce(
        (sum, stock) =>
          sum +
          safeNumber(
            stock.investment
          ),
        0
      );

    /*
      Total validation.
    */
    if (
      Math.abs(
        total -
          safeNumber(
            plan.invested
          )
      ) > 0.01
    ) {
      throw new Error(
        "Final validation failed: invested total mismatch."
      );
    }

    if (
      total >
      budget + 0.01
    ) {
      throw new Error(
        "Final validation failed: budget exceeded."
      );
    }

    /*
      Every selected position.
    */
    for (
      const stock of
      plan.selected
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
          ? investment /
            budget
          : 0;

      /*
        HARD LIMIT.
      */
      if (
        stockPercent >
        HARD_MAX_STOCK +
          0.000001
      ) {
        throw new Error(
          `${stock.symbol} 35% hard limit exceed kar raha hai.`
        );
      }

      /*
        Normal / small-budget limit.
      */
      const allowed =
        getStockLimitPercent(
          budget,
          quantity
        );

      if (
        stockPercent >
        allowed +
          0.000001
      ) {
        throw new Error(
          `${stock.symbol} individual allocation limit exceed kar raha hai.`
        );
      }
    }

    /*
      Sector validation.
    */
    const sectorTotals = {};

    plan.selected.forEach(
      stock => {
        sectorTotals[
          stock.sector
        ] =
          (
            sectorTotals[
              stock.sector
            ] || 0
          ) +
          safeNumber(
            stock.investment
          );
      }
    );

    for (
      const sector of
      Object.keys(
        sectorTotals
      )
    ) {
      if (
        sectorTotals[
          sector
        ] >
        budget *
          MAX_SECTOR_ALLOCATION +
          0.01
      ) {
        throw new Error(
          `${sector} sector 40% limit exceed kar raha hai.`
        );
      }
    }

    /*
      Business-group validation.
    */
    const groupTotals = {};

    plan.selected.forEach(
      stock => {
        groupTotals[
          stock.businessGroup
        ] =
          (
            groupTotals[
              stock.businessGroup
            ] || 0
          ) +
          safeNumber(
            stock.investment
          );
      }
    );

    for (
      const group of
      Object.keys(
        groupTotals
      )
    ) {
      if (
        groupTotals[
          group
        ] >
        budget *
          MAX_GROUP_ALLOCATION +
          0.01
      ) {
        throw new Error(
          `${group} business-group 30% limit exceed kar raha hai.`
        );
      }
    }

    return true;
  }

  /* ============================================================
     PORTFOLIO
  ============================================================ */

  function getTrackedPortfolio() {
    const current =
      storageRead(
        PORTFOLIO_KEY
      );

    if (
      current &&
      Array.isArray(
        current.positions
      )
    ) {
      return current;
    }

    /*
      Migrate old portfolio only as data,
      but do NOT silently carry old stale
      positions into a NEW analysis.
    */
    for (
      const oldKey of
      OLD_PORTFOLIO_KEYS
    ) {
      const old =
        storageRead(
          oldKey
        );

      if (
        old &&
        Array.isArray(
          old.positions
        )
      ) {
        return old;
      }
    }

    return null;
  }

  function createPortfolioFromPlan(
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
            normalizeSymbol(
              stock.symbol
            ),

          name:
            stock.name,

          quantity:
            safeNumber(
              stock.quantity
            ),

          averagePrice:
            safeNumber(
              stock.price
            ),

          invested:
            safeNumber(
              stock.investment
            ),

          currentPrice:
            safeNumber(
              stock.price
            ),

          currentValue:
            safeNumber(
              stock.investment
            ),

          pnl: 0,

          pnlPercent: 0,

          updatedAt:
            nowISO()
        }));

    return {
      version:
        "v13",

      month:
        currentMonthKey(),

      updatedAt:
        nowISO(),

      budget:
        plan.budget,

      invested:
        plan.invested,

      currentValue:
        plan.invested,

      pnl: 0,

      pnlPercent: 0,

      positions
    };
  }

  function updatePortfolioPrices() {
    const portfolio =
      storageRead(
        PORTFOLIO_KEY
      );

    if (
      !portfolio ||
      !Array.isArray(
        portfolio.positions
      )
    ) {
      return null;
    }

    const stocks =
      getStocksFromMarketData();

    const liveMap =
      new Map();

    stocks.forEach(
      stock => {
        liveMap.set(
          normalizeSymbol(
            stock.symbol
          ),
          stock
        );
      }
    );

    let invested = 0;
    let currentValue = 0;

    portfolio.positions =
      portfolio.positions.map(
        position => {
          const symbol =
            normalizeSymbol(
              position.symbol
            );

          const live =
            liveMap.get(
              symbol
            );

          const quantity =
            safeNumber(
              position.quantity
            );

          const averagePrice =
            safeNumber(
              position.averagePrice
            );

          const currentPrice =
            live
              ? safeNumber(
                  live.price,
                  averagePrice
                )
              : averagePrice;

          const positionInvested =
            quantity *
            averagePrice;

          const value =
            quantity *
            currentPrice;

          const pnl =
            value -
            positionInvested;

          const pnlPercent =
            positionInvested > 0
              ? pnl /
                positionInvested *
                100
              : 0;

          invested +=
            positionInvested;

          currentValue +=
            value;

          return {
            ...position,

            currentPrice,

            invested:
              positionInvested,

            currentValue:
              value,

            pnl,

            pnlPercent,

            updatedAt:
              nowISO()
          };
        }
      );

    portfolio.invested =
      invested;

    portfolio.currentValue =
      currentValue;

    portfolio.pnl =
      currentValue -
      invested;

    portfolio.pnlPercent =
      invested > 0
        ? (
            portfolio.pnl /
            invested
          ) * 100
        : 0;

    portfolio.updatedAt =
      nowISO();

    storageWrite(
      PORTFOLIO_KEY,
      portfolio
    );

    return portfolio;
  }

  /* ============================================================
     PORTFOLIO UI
  ============================================================ */

  function renderPortfolio(
    portfolio
  ) {
    if (
      !portfolio ||
      !Array.isArray(
        portfolio.positions
      )
    ) {
      return `
        <div class="p1-empty">
          Abhi koi tracked portfolio nahi hai.
        </div>
      `;
    }

    const pnl =
      safeNumber(
        portfolio.pnl
      );

    const pnlClass =
      pnl >= 0
        ? "p1-positive"
        : "p1-negative";

    let html = `
      <div class="p1-grid">

        <div class="p1-card">
          <div class="p1-card-label">
            Tracked Invested
          </div>

          <div class="p1-card-value">
            ${money(
              portfolio.invested
            )}
          </div>
        </div>

        <div class="p1-card">
          <div class="p1-card-label">
            Current Value
          </div>

          <div class="p1-card-value">
            ${money(
              portfolio.currentValue
            )}
          </div>
        </div>

        <div class="p1-card">
          <div class="p1-card-label">
            Current P/L
          </div>

          <div class="p1-card-value ${pnlClass}">
            ${
              pnl >= 0
                ? "+"
                : ""
            }${money(pnl)}
          </div>

          <div class="p1-small">
            ${percent(
              portfolio.pnlPercent
            )}
          </div>
        </div>

      </div>

      <div class="p1-table-wrap"
           style="margin-top:14px;">

        <table class="p1-table">

          <thead>
            <tr>
              <th>Stock</th>
              <th>Qty</th>
              <th>Avg</th>
              <th>Live</th>
              <th>Value</th>
              <th>P/L</th>
            </tr>
          </thead>

          <tbody>
    `;

    portfolio.positions.forEach(
      position => {
        const positionPnl =
          safeNumber(
            position.pnl
          );

        html += `
          <tr>

            <td>
              <strong>
                ${escapeHtml(
                  position.symbol
                )}
              </strong>
            </td>

            <td>
              ${safeNumber(
                position.quantity
              )}
            </td>

            <td>
              ${money(
                position.averagePrice
              )}
            </td>

            <td>
              ${money(
                position.currentPrice
              )}
            </td>

            <td>
              ${money(
                position.currentValue
              )}
            </td>

            <td class="${
              positionPnl >= 0
                ? "p1-positive"
                : "p1-negative"
            }">

              ${
                positionPnl >= 0
                  ? "+"
                  : ""
              }${money(
                positionPnl
              )}

              <br>

              <span class="p1-small">
                ${percent(
                  position.pnlPercent
                )}
              </span>

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

    return html;
  }

  /* ============================================================
     TOP 20 UI
  ============================================================ */

  function renderTop20(
    ranked
  ) {
    if (!top20List) {
      return;
    }

    /*
      FINAL FIX:
      Current Top-20 is ALWAYS:
      ranked[0] -> #1
      ranked[1] -> #2
      ...
      ranked[19] -> #20

      Monthly ranks are NEVER used here.
    */

    const top20 =
      ranked.slice(
        0,
        TARGET_TOP20
      );

    if (!top20.length) {
      top20List.innerHTML = `
        <div class="p1-empty">
          Live Top-20 available nahi hai.
        </div>
      `;

      return;
    }

    top20List.innerHTML =
      top20
        .map(
          (stock, index) => {
            const change =
              safeNumber(
                stock.change
              );

            return `
              <div class="p1-top-row">

                <div class="p1-rank">
                  ${index + 1}
                </div>

                <div>

                  <div class="p1-stock-name">
                    ${escapeHtml(
                      stock.name
                    )}
                  </div>

                  <div class="p1-stock-meta">
                    ${escapeHtml(
                      stock.symbol
                    )}
                    •
                    ${escapeHtml(
                      stock.sector
                    )}
                    • Nifty 50
                  </div>

                </div>

                <div class="p1-price">

                  <div class="${
                    change >= 0
                      ? "p1-positive"
                      : "p1-negative"
                  }">
                    ${signedPercent(
                      change
                    )}
                  </div>

                  <div>
                    ${money(
                      stock.price
                    )}
                  </div>

                </div>

              </div>
            `;
          }
        )
        .join("");
  }

  /* ============================================================
     WATCHLIST UI
  ============================================================ */

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
        .filter(stock => {
          const symbol =
            normalizeSymbol(
              stock.symbol
            );

          return (
            !monthlySet.has(
              symbol
            ) &&
            stock.dailyRank >
              TARGET_TOP20
        );
        })
        .slice(
          0,
          3
        );

    if (!candidates.length) {
      element.innerHTML = `
        <div class="p1-empty">
          No watch candidates right now.
        </div>
      `;

      return;
    }

    element.innerHTML =
      candidates
        .map(
          stock => `
            <div class="p1-monitor-row">

              <div class="p1-monitor-title">

                <div>
                  <strong>
                    ${escapeHtml(
                      stock.name
                    )}
                  </strong>

                  <div class="p1-small">
                    ${escapeHtml(
                      stock.symbol
                    )}
                    •
                    ${escapeHtml(
                      stock.sector
                    )}
                  </div>
                </div>

                <span class="p1-pill watch">
                  WATCH
                </span>

              </div>

            </div>
          `
        )
        .join("");
  }

  /* ============================================================
     MONITORING UI
  ============================================================ */

  function stateClass(
    state
  ) {
    if (
      state ===
      "HOLD"
    ) {
      return "hold";
    }

    if (
      state ===
      "IMPROVING"
    ) {
      return "improving";
    }

    if (
      state ===
      "EXIT REVIEW"
    ) {
      return "exit";
    }

    return "watch";
  }

  function renderMonitoring(
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

    let html = `
      <div class="p1-section">

        <h3>
          📊 Monthly Top-20 Monitoring
        </h3>

        <p class="p1-small">
          Daily monitoring ACTIVE hai.
          Daily rank fluctuation se
          monthly investment decision
          automatically change nahi hota.
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

      const relevant =
        monthlySet.has(
          symbol
        ) ||
        state.state ===
          "IMPROVING" ||
        state.state ===
          "EXIT REVIEW";

      if (!relevant) {
        return;
      }

      html += `
        <div class="p1-monitor-row">

          <div class="p1-monitor-title">

            <div>
              <strong>
                ${escapeHtml(
                  stock.symbol
                )}
              </strong>

              —
              Daily Rank #${stock.dailyRank}
            </div>

            <span class="p1-pill ${
              stateClass(
                state.state
              )
            }">
              ${escapeHtml(
                state.state
              )}
            </span>

          </div>

          <div class="p1-small">
            ${escapeHtml(
              state.reason
            )}
          </div>

        </div>
      `;
    });

    html += `
      </div>
    `;

    return html;
  }

  /* ============================================================
     REPLACEMENT UI
  ============================================================ */

  function renderReplacementCandidates(
    candidates,
    exitReviews
  ) {
    let html = `
      <div class="p1-section">

        <h3>
          🔄 Replacement Candidates
        </h3>
    `;

    if (
      candidates.length
    ) {
      candidates.forEach(
        stock => {
          html += `
            <div class="p1-monitor-row">

              <div class="p1-monitor-title">

                <div>
                  <strong>
                    ${escapeHtml(
                      stock.symbol
                    )}
                  </strong>

                  —
                  Daily Rank #${stock.dailyRank}
                </div>

                <span class="p1-pill improving">
                  IMPROVING
                </span>

              </div>

              <div class="p1-small">
                Monthly review ke liye
                candidate.
              </div>

            </div>
          `;
        }
      );
    } else {
      html += `
        <div class="p1-empty">
          Abhi koi fresh replacement
          candidate nahi hai.
        </div>
      `;
    }

    if (
      exitReviews.length
    ) {
      html += `
        <div class="p1-danger"
             style="margin-top:12px;">

          <strong>
            ⚠️ EXIT REVIEW
          </strong>

          <div style="margin-top:6px;">
            ${exitReviews
              .map(
                stock =>
                  escapeHtml(
                    stock.symbol
                  )
              )
              .join(
                " • "
              )}
          </div>

        </div>
      `;
    }

    html += `
      </div>
    `;

    return html;
  }

  /* ============================================================
     PLAN UI
  ============================================================ */

  function renderPlan(
    plan,
    decisionStocks
  ) {
    let html = `
      <div class="p1-dashboard">

        <div class="p1-hero">

          <h2>
            🤖 Prototype-1 V13
          </h2>

          <p>
            Monthly Top-20 Smart Investment Engine
          </p>

        </div>

        <div class="p1-grid">

          <div class="p1-card">
            <div class="p1-card-label">
              Investment Budget
            </div>

            <div class="p1-card-value">
              ${money(
                plan.budget
              )}
            </div>
          </div>

          <div class="p1-card">
            <div class="p1-card-label">
              Invested
            </div>

            <div class="p1-card-value">
              ${money(
                plan.invested
              )}
            </div>
          </div>

          <div class="p1-card">
            <div class="p1-card-label">
              Balance
            </div>

            <div class="p1-card-value">
              ${money(
                plan.balance
              )}
            </div>
          </div>

          <div class="p1-card">
            <div class="p1-card-label">
              Selected Stocks
            </div>

            <div class="p1-card-value">
              ${plan.selectedCount}
            </div>
          </div>

        </div>

        <div class="p1-section">

          <h3>
            📌 Investment Plan
          </h3>

          <p class="p1-small">
            Decision Mode:
            <strong>MONTHLY</strong>
            • Daily Monitoring:
            <strong>ACTIVE</strong>
            • Monthly Decision Stocks:
            <strong>
              ${decisionStocks.length}
            </strong>
          </p>

          <div class="p1-table-wrap">

            <table class="p1-table">

              <thead>

                <tr>
                  <th>#</th>
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
      IMPORTANT:
      Visible allocation rank is ALWAYS
      1,2,3...
      No missing rank such as 3,4,8...
    */

    plan.selected.forEach(
      (stock, index) => {
        const actualPercent =
          plan.budget > 0
            ? (
                stock.investment /
                plan.budget
              ) * 100
            : 0;

        html += `
          <tr>

            <td>
              <strong>
                ${index + 1}
              </strong>
            </td>

            <td>
              <strong>
                ${escapeHtml(
                  stock.symbol
                )}
              </strong>

              <br>

              <span class="p1-small">
                ${escapeHtml(
                  stock.name
                )}
              </span>
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

          </div>

        </div>

        <div class="p1-section">

          <h3>
            ⭐ Selected Stocks
          </h3>

          <div class="p1-selected">
    `;

    plan.selected
      .filter(
        stock =>
          safeNumber(
            stock.quantity
          ) > 0
      )
      .forEach(
        stock => {
          html += `
            <div class="p1-selected-card">

              <strong>
                ${escapeHtml(
                  stock.symbol
                )}
              </strong>

              <div class="p1-small">
                ${escapeHtml(
                  stock.name
                )}
              </div>

              <div style="
                margin-top:8px;
                font-weight:800;
              ">
                ${stock.quantity}
                share(s)
              </div>

              <div>
                ${money(
                  stock.investment
                )}
              </div>

            </div>
          `;
        }
      );

    html += `
          </div>

        </div>

        <div class="p1-section">

          <h3>
            🧠 V13 Decision Logic
          </h3>

          <ul>

            <li>
              Monthly Top-20 investment
              decision ka primary reference hai.
            </li>

            <li>
              Daily ranking sirf monitoring signal hai.
            </li>

            <li>
              Daily fluctuation se automatic
              BUY/SELL nahi hota.
            </li>

            <li>
              Current-month monthly snapshot
              daily ranking se overwrite nahi hota.
            </li>

            <li>
              Monthly Top-20 mein strong deterioration
              par EXIT REVIEW milta hai.
            </li>

            <li>
              EXIT REVIEW stock fresh allocation
              mein completely excluded hai.
            </li>

            <li>
              Daily Top-20 ke improving stocks
              next monthly review candidates hain.
            </li>

            <li>
              Whole-share allocation use hota hai.
            </li>

            <li>
              Normal individual-stock limit:
              <strong>20%</strong>
            </li>

            <li>
              ₹20,000 se kam budget mein
              first-share controlled exception:
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
              Fake research score generate nahi hota.
            </li>

            <li>
              Available live market data hi use hota hai.
            </li>

            <li>
              Final validation allocation rules
              ko dobara verify karti hai.
            </li>

          </ul>

        </div>

        <div class="p1-section">

          <h3>
            💰 Investment Tracking
          </h3>

          <div id="p1PortfolioArea">
            ${renderPortfolio(
              updatePortfolioPrices()
            )}
          </div>

        </div>

      </div>
    `;

    return html;
  }

  /* ============================================================
     MAIN ANALYSIS
  ============================================================ */

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

    /*
      DAILY ranking.
    */
    const ranked =
      smartRankStocks(
        stocks
      );

    /*
      MONTHLY snapshot.
      Existing snapshot is preserved.
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

    /*
      DAILY monitoring.
    */
    const monitoring =
      buildMonitoring(
        ranked,
        monthlyMemory
      );

    /*
      Current Top-20 UI:
      always daily #1 -> #20.
    */
    renderTop20(
      ranked
    );

    renderWatchlist(
      ranked,
      monthlyMemory
    );

    /*
      Monthly decision list.
    */
    const monthlyStocks =
      getMonthlyStocks(
        ranked,
        monthlyMemory
      );

    if (
      !monthlyStocks.length
    ) {
      throw new Error(
        "Monthly Top-20 ke stocks current live market data mein available nahi hain."
      );
    }

    const exitReviews =
      getExitReviewStocks(
        monthlyStocks,
        monitoring
      );

    const decisionStocks =
      getFreshInvestmentCandidates(
        monthlyStocks,
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
        "Current monthly Top-20 ke saare eligible stocks EXIT REVIEW mein hain. Fresh allocation generate nahi kiya gaya."
      );
    }

    /*
      SMART PLAN.
    */
    const plan =
      buildSmartPlan(
        decisionStocks,
        budget
      );

    if (
      plan.selectedCount <= 0
    ) {
      throw new Error(
        "Is investment amount par whole-share allocation se koi valid stock allocate nahi ho paya."
      );
    }

    /*
      FINAL VALIDATION.
    */
    validatePlan(
      plan
    );

    /*
      IMPORTANT:
      Fresh analysis ka result
      explicitly tracked portfolio banata hai.
      Old stale positions silently
      merge nahi ki jaati.
    */
    const portfolio =
      createPortfolioFromPlan(
        plan
      );

    storageWrite(
      PORTFOLIO_KEY,
      portfolio
    );

    /*
      Immediately live prices update.
    */
    updatePortfolioPrices();

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

      monthlyStocks,

      exitReviews,

      replacementCandidates,

      decisionStocks,

      plan
    };
  }

  /* ============================================================
     EXPOSE ENGINE
  ============================================================ */

  window.analyzeInvestmentAmount =
    analyzeInvestmentAmount;

  window.prototype1V13 = {
    smartRankStocks,

    ensureMonthlyTop20,

    buildMonitoring,

    buildSmartPlan,

    validatePlan,

    updatePortfolioPrices
  };

  /* ============================================================
     CONNECT LIVE MARKET DATA
     ============================================================
     IMPORTANT:
     Existing quotes.js flow is NOT modified.
     Only existing fetchMarketData(totp)
     is called.
  ============================================================ */

  if (connectButton) {
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

          if (
            marketStatus
          ) {
            marketStatus.textContent =
              "Connecting...";
          }

          /*
            EXISTING FLOW — untouched.
          */
          const result =
            await window.fetchMarketData(
              totp
            );

          /*
            Some quotes.js versions update
            window.MARKET_DATA themselves.
            Others return the array.
            Both are supported.
          */
          if (
            Array.isArray(
              result
            ) &&
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
              "Monthly Top-20 memory create nahi ho payi."
            );
          }

          const monitoring =
            buildMonitoring(
              ranked,
              monthlyMemory
            );

          renderTop20(
            ranked
          );

          renderWatchlist(
            ranked,
            monthlyMemory
          );

          /*
            Existing portfolio live-price update.
          */
          updatePortfolioPrices();

          if (
            marketStatus
          ) {
            marketStatus.textContent =
              `Live market data connected successfully. ${stocks.length}/${stocks.length} stocks received.`;
          }

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div class="p1-dashboard">

                <div class="p1-hero">

                  <h2>
                    ✅ Live Market Data Connected
                  </h2>

                  <p>
                    ${stocks.length}/${stocks.length}
                    valid stocks received.
                  </p>

                </div>

                <div class="p1-grid">

                  <div class="p1-card">
                    <div class="p1-card-label">
                      Nifty 50 Data
                    </div>

                    <div class="p1-card-value">
                      ${stocks.length}/50
                    </div>
                  </div>

                  <div class="p1-card">
                    <div class="p1-card-label">
                      Daily Top Stocks
                    </div>

                    <div class="p1-card-value">
                      20
                    </div>
                  </div>

                  <div class="p1-card">
                    <div class="p1-card-label">
                      Monthly Mode
                    </div>

                    <div class="p1-card-value">
                      ACTIVE
                    </div>
                  </div>

                  <div class="p1-card">
                    <div class="p1-card-label">
                      Daily Monitoring
                    </div>

                    <div class="p1-card-value">
                      ACTIVE
                    </div>
                  </div>

                </div>

                <div class="p1-success">

                  <strong>
                    Monthly snapshot:
                  </strong>

                  ${escapeHtml(
                    monthlyMemory.month
                  )}

                  <br>

                  Existing monthly snapshot
                  daily ranking se overwrite
                  nahi hoga.

                </div>

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
            "Prototype-1 V13 connect error:",
            error
          );

          if (
            marketStatus
          ) {
            marketStatus.textContent =
              "Connection failed";
          }

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

  /* ============================================================
     ANALYZE BUTTON
  ============================================================ */

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

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div class="p1-section">
                <strong>
                  🤖 AI Engine analysis chal raha hai...
                </strong>

                <p class="p1-small">
                  Monthly Top-20,
                  daily monitoring aur
                  whole-share validation
                  process ho rahi hai.
                </p>
              </div>
            `;
          }

          await analyzeInvestmentAmount(
            amount
          );
        } catch (error) {
          console.error(
            "Prototype-1 V13 analysis error:",
            error
          );

          if (
            recommendation
          ) {
            recommendation.innerHTML = `
              <div class="p1-danger">

                <strong>
                  ⚠️ Analysis Error
                </strong>

                <p>
                  ${escapeHtml(
                    error?.message ||
                    "Investment analysis failed."
                  )}
                </p>

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

  /* ============================================================
     INITIAL LIVE RENDER
  ============================================================ */

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

        renderTop20(
          ranked
        );

        renderWatchlist(
          ranked,
          monthlyMemory
        );

        updatePortfolioPrices();

        console.log(
          "Prototype-1 V13 initial render complete."
        );
      }
    }
  } catch (error) {
    console.warn(
      "Prototype-1 V13 initial render skipped:",
      error
    );
  }

  console.log(
    "✅ Prototype-1 App Engine V13 loaded successfully."
  );
})();
