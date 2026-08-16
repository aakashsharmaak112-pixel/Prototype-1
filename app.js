// ======================================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + NIFTY TOP-20 WEIGHTED ALLOCATION
// ======================================================

(function () {
  "use strict";

  console.log("Prototype-1 app.js loading...");

  const MAX_STOCK_ALLOCATION = 0.35;
  let isConnecting = false;
  let appBound = false;

  // ====================================================
  // NIFTY 50 APPROXIMATE INDEX WEIGHTS
  // Used only when weight is not already present
  // in NIFTY_50_STOCKS / MARKET_DATA.
  // ====================================================

  const NIFTY_WEIGHTS = {
    HDFCBANK: 13.2,
    RELIANCE: 8.9,
    ICICIBANK: 8.1,
    BHARTIARTL: 5.9,
    INFY: 5.1,
    TCS: 3.9,
    LT: 3.7,
    ITC: 3.2,
    AXISBANK: 3.0,
    KOTAKBANK: 2.8,
    SBIN: 2.7,
    M&M: 2.7,
    BAJFINANCE: 2.5,
    HINDUNILVR: 2.2,
    SUNPHARMA: 1.9,
    MARUTI: 1.8,
    TITAN: 1.7,
    BHARTI: 1.6,
    ADANIENT: 1.5,
    ADANIPORTS: 1.5,
    HCLTECH: 1.5,
    BEL: 1.4,
    TATASTEEL: 1.3,
    NTPC: 1.3,
    POWERGRID: 1.2,
    ONGC: 1.1,
    WIPRO: 1.0,
    COALINDIA: 0.9,
    ETERNAL: 0.9,
    GRASIM: 0.9,
    TECHM: 0.8,
    JSWSTEEL: 0.8,
    TRENT: 0.8,
    HINDALCO: 0.8,
    TATAMOTORS: 0.8,
    NESTLEIND: 0.7,
    DRREDDY: 0.7,
    APOLLOHOSP: 0.7,
    CIPLA: 0.7,
    EICHERMOT: 0.6,
    BAJAJ_AUTO: 0.6,
    SHRIRAMFIN: 0.6,
    HEROMOTOCO: 0.5,
    INDUSINDBK: 0.5,
    BPCL: 0.5,
    UPL: 0.4,
    ADANIGREEN: 0.4,
    ASIANPAINT: 0.4,
    BRITANNIA: 0.4,
    SBILIFE: 0.4,
    TATACONSUM: 0.4
  };

  // ====================================================
  // DOM BINDING
  // ====================================================

  function bindApp() {
    if (appBound) return;

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

    appBound = true;

    // --------------------------------------------------
    // CONNECT LIVE DATA
    // --------------------------------------------------

    connectButton.addEventListener("click", async function () {
      if (isConnecting) return;

      hideError();

      const totp = String(totpInput.value || "").trim();

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
          const msg =
            window.MARKET_DATA &&
            window.MARKET_DATA.error
              ? window.MARKET_DATA.error
              : "Live market data connect nahi ho paya.";

          showError(msg);
          setMarketStatus("ERROR", "status-error");
          return;
        }

        const received = Number(
          window.MARKET_DATA.received || 0
        );

        const requested = Number(
          window.MARKET_DATA.requested || 50
        );

        setMarketStatus(
          `LIVE • ${received}/${requested}`,
          "status-ready"
        );

        renderTop20();

        recommendation.innerHTML =
          `Live market data connected successfully. ${received}/${requested} stocks received.`;

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
        connectButton.textContent = "Connect Live Market Data";
      }
    });

    // --------------------------------------------------
    // ANALYZE
    // --------------------------------------------------

    analyzeButton.addEventListener("click", function () {
      hideError();

      const amount = Number(amountInput.value);

      if (!Number.isFinite(amount) || amount <= 0) {
        recommendation.innerHTML =
          "Please valid investment amount enter karein.";
        return;
      }

      if (typeof window.analyzeInvestmentAmount !== "function") {
        recommendation.innerHTML =
          "Investment engine load nahi hua. Page refresh karke dobara try karein.";
        return;
      }

      try {
        const result =
          window.analyzeInvestmentAmount(amount);

        recommendation.innerHTML =
          result && result.success
            ? result.html
            : result && result.message
            ? result.message
            : "Investment analysis available nahi hai.";

      } catch (error) {
        console.error("Analysis error:", error);
        recommendation.innerHTML =
          "Investment analysis mein error aaya.";
      }
    });

    amountInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") analyzeButton.click();
    });

    totpInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") connectButton.click();
    });

    if (
      window.MARKET_DATA &&
      window.MARKET_DATA.success
    ) {
      renderTop20();
    }

    console.log("Prototype-1 controls bound.");
  }

  // ====================================================
  // START APP
  // ====================================================

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindApp);
  } else {
    bindApp();
  }

  // ====================================================
  // MAIN ANALYSIS
  // ====================================================

  window.analyzeInvestmentAmount = function (amount) {
    amount = Number(amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        message: "Please valid investment amount enter karein."
      };
    }

    let stocks = getStocksFromMarketData()
      .map(normalizeStock)
      .filter(isValidStock);

    if (!stocks.length) {
      return {
        success: false,
        message:
          "Pehle Connect Live Market Data karke live quotes load karein."
      };
    }

    // -----------------------------------------------
    // LIVE PERFORMANCE RANKING
    // -----------------------------------------------

    stocks.sort(function (a, b) {
      return b.change - a.change;
    });

    // -----------------------------------------------
    // TOP 20 ONLY
    // -----------------------------------------------

    const top20 = stocks.slice(0, 20);

    // -----------------------------------------------
    // WEIGHT BASED ALLOCATION
    // -----------------------------------------------

    const selected = buildWeightedPortfolio(
      top20,
      amount
    );

    if (!selected.length) {
      return {
        success: false,
        message:
          "Current Top 20 mein is budget ke andar allocation nahi ban paaya."
      };
    }

    const totalInvestment = selected.reduce(
      function (sum, stock) {
        return sum + stock.investment;
      },
      0
    );

    const balance = Math.max(
      0,
      amount - totalInvestment
    );

    return {
      success: true,

      html: buildRecommendationHTML(
        amount,
        top20,
        selected,
        totalInvestment,
        balance
      ),

      selectedStocks: selected,
      totalInvestment: totalInvestment,
      balance: balance
    };
  };

  // ====================================================
  // MARKET DATA
  // ====================================================

  function getStocksFromMarketData() {
    const market = window.MARKET_DATA;

    if (!market || !market.stocks) return [];

    if (Array.isArray(market.stocks)) {
      return market.stocks;
    }

    if (typeof market.stocks !== "object") {
      return [];
    }

    return Object.keys(market.stocks).map(function (key) {
      const item = market.stocks[key] || {};

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
          "",

        price:
          item.price ??
          item.ltp ??
          item.lastPrice ??
          0,

        change:
          item.perChange ??
          item.percentChange ??
          item.change ??
          0,

        niftyWeight:
          item.niftyWeight ??
          item.weight ??
          item.indexWeight ??
          0
      };
    });
  }

  // ====================================================
  // NORMALIZE
  // ====================================================

  function normalizeStock(stock) {
    stock = stock || {};

    const symbol = String(
      stock.symbol ||
      stock.neoSymbol ||
      stock.displaySymbol ||
      ""
    )
      .replace(/-EQ$/i, "")
      .trim()
      .toUpperCase();

    const master = findNiftyStock(symbol);

    const cleanSymbol =
      symbol === "BAJAJ-AUTO"
        ? "BAJAJ_AUTO"
        : symbol;

    const name = String(
      stock.name ||
      stock.companyName ||
      (master && master.name) ||
      stock.displaySymbol ||
      symbol
    ).trim();

    const price = Number(
      stock.price ??
      stock.ltp ??
      stock.lastPrice ??
      stock.close ??
      0
    );

    const change = Number(
      stock.perChange ??
      stock.percentChange ??
      stock.change ??
      0
    );

    const sector = String(
      stock.sector ||
      (master && master.sector) ||
      "Nifty 50"
    );

    const directWeight = Number(
      stock.niftyWeight ??
      stock.weight ??
      stock.indexWeight ??
      0
    );

    const masterWeight = Number(
      master &&
      (
        master.niftyWeight ??
        master.weight ??
        master.indexWeight ??
        0
      )
    );

    const fallbackWeight =
      NIFTY_WEIGHTS[cleanSymbol] ||
      NIFTY_WEIGHTS[symbol] ||
      0;

    const niftyWeight =
      directWeight > 0
        ? directWeight
        : masterWeight > 0
        ? masterWeight
        : fallbackWeight;

    return {
      symbol,
      name,
      sector,
      price,
      change,
      niftyWeight
    };
  }

  // ====================================================
  // FIND NIFTY STOCK
  // ====================================================

  function findNiftyStock(symbol) {
    const list =
      Array.isArray(window.NIFTY_50_STOCKS)
        ? window.NIFTY_50_STOCKS
        : [];

    for (let i = 0; i < list.length; i++) {
      const itemSymbol = String(
        list[i].symbol ||
        list[i].neoSymbol ||
        ""
      )
        .replace(/-EQ$/i, "")
        .toUpperCase();

      if (
        itemSymbol === symbol ||
        itemSymbol ===
          symbol.replace(/-EQ$/i, "")
      ) {
        return list[i];
      }
    }

    return null;
  }

  // ====================================================
  // VALID STOCK
  // ====================================================

  function isValidStock(stock) {
    return Boolean(
      stock &&
      stock.symbol &&
      Number.isFinite(stock.price) &&
      stock.price > 0 &&
      Number.isFinite(stock.change)
    );
  }

  // ====================================================
  // TOP 20
  // ====================================================

  function renderTop20() {
    const list =
      document.getElementById("top20List");

    if (!list) return;

    const stocks = getStocksFromMarketData()
      .map(normalizeStock)
      .filter(isValidStock)
      .sort(function (a, b) {
        return b.change - a.change;
      })
      .slice(0, 20);

    if (!stocks.length) {
      list.innerHTML =
        '<p class="note">Live market data available nahi hai.</p>';
      return;
    }

    const fragment =
      document.createDocumentFragment();

    stocks.forEach(function (stock, index) {
      const row =
        document.createElement("div");

      row.className = "stock";

      const left =
        document.createElement("div");

      left.className = "stock-left";

      const rank =
        document.createElement("div");

      rank.className = "rank";
      rank.textContent = index + 1;

      const info =
        document.createElement("div");

      const name =
        document.createElement("div");

      name.className = "stock-name";
      name.textContent = stock.name;

      const sector =
        document.createElement("div");

      sector.className = "stock-sector";

      sector.textContent =
        `${stock.symbol} • ${stock.sector}`;

      info.appendChild(name);
      info.appendChild(sector);

      left.appendChild(rank);
      left.appendChild(info);

      const right =
        document.createElement("div");

      right.className = "stock-change";

      const change =
        document.createElement("div");

      change.className =
        stock.change >= 0
          ? "positive"
          : "negative";

      change.textContent =
        `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;

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

    list.replaceChildren(fragment);
  }

  // ====================================================
  // WEIGHTED PORTFOLIO
  //
  // IMPORTANT:
  // No fixed 2/4/5 stock rule.
  //
  // Top 20 ke har affordable stock ko target weight
  // ke according consider kiya jata hai.
  // Whole shares ke baad remaining balance ko
  // dobara best-fit stocks mein use kiya jata hai.
  // ====================================================

  function buildWeightedPortfolio(stocks, amount) {
    if (!Array.isArray(stocks) || !stocks.length) {
      return [];
    }

    const affordable = stocks
      .map(function (stock, index) {
        return {
          ...stock,
          rank: index + 1
        };
      })
      .filter(function (stock) {
        return stock.price <= amount;
      });

    if (!affordable.length) return [];

    let totalWeight =
      affordable.reduce(function (sum, stock) {
        return sum + stock.niftyWeight;
      }, 0);

    // If weights are unavailable, use equal allocation
    // across Top 20 rather than silently selecting 2-5.
    if (totalWeight <= 0) {
      affordable.forEach(function (stock) {
        stock.niftyWeight = 1;
      });

      totalWeight = affordable.length;
    }

    // -----------------------------------------------
    // TARGET RUPEE ALLOCATION
    // -----------------------------------------------

    affordable.forEach(function (stock) {
      stock.targetPercent =
        (stock.niftyWeight / totalWeight) * 100;

      stock.targetAmount =
        amount *
        (stock.targetPercent / 100);

      // Maximum single-stock limit
      stock.allowedAmount =
        Math.min(
          stock.targetAmount,
          amount * MAX_STOCK_ALLOCATION
        );

      stock.quantity = Math.floor(
        stock.allowedAmount / stock.price
      );

      stock.investment =
        stock.quantity * stock.price;
    });

    // -----------------------------------------------
    // REMOVE ZERO-SHARE STOCKS
    // -----------------------------------------------

    let selected = affordable.filter(function (stock) {
      return stock.quantity > 0;
    });

    // -----------------------------------------------
    // SORT BY WEIGHT FIRST
    // -----------------------------------------------

    selected.sort(function (a, b) {
      return b.niftyWeight - a.niftyWeight;
    });

    // -----------------------------------------------
    // WHOLE-SHARE BALANCE
    // -----------------------------------------------

    let total = selected.reduce(function (
      sum,
      stock
    ) {
      return sum + stock.investment;
    }, 0);

    let balance = Math.max(
      0,
      amount - total
    );

    // -----------------------------------------------
    // USE REMAINING BALANCE
    //
    // Preference:
    // 1. Closest to target weight
    // 2. Higher Nifty weight
    // 3. Better live performance
    // -----------------------------------------------

    while (balance > 0) {
      let best = null;
      let bestScore = -Infinity;

      affordable.forEach(function (stock) {
        if (stock.price > balance) return;

        const current =
          selected.find(function (item) {
            return item.symbol === stock.symbol;
          });

        const currentInvestment =
          current ? current.investment : 0;

        const afterInvestment =
          currentInvestment + stock.price;

        if (
          afterInvestment >
          amount * MAX_STOCK_ALLOCATION
        ) {
          return;
        }

        const target =
          stock.targetAmount;

        const beforeGap =
          Math.abs(
            target - currentInvestment
          );

        const afterGap =
          Math.abs(
            target - afterInvestment
          );

        const improvement =
          beforeGap - afterGap;

        const score =
          improvement * 1000 +
          stock.niftyWeight * 2 +
          stock.change * 0.1;

        if (score > bestScore) {
          bestScore = score;
          best = stock;
        }
      });

      if (!best) break;

      let existing =
        selected.find(function (item) {
          return item.symbol === best.symbol;
        });

      if (existing) {
        existing.quantity += 1;
        existing.investment += best.price;
      } else {
        selected.push({
          ...best,
          quantity: 1,
          investment: best.price
        });
      }

      total += best.price;
      balance -= best.price;
    }

    // -----------------------------------------------
    // FINAL SAFETY
    // -----------------------------------------------

    selected = selected.filter(function (stock) {
      return stock.quantity > 0;
    });

    return selected;
  }

  // ====================================================
  // RECOMMENDATION TABLE
  // ====================================================

  function buildRecommendationHTML(
    amount,
    top20,
    selected,
    totalInvestment,
    balance
  ) {
    const totalTop20Weight =
      top20.reduce(function (sum, stock) {
        return sum + stock.niftyWeight;
      }, 0);

    let html = "";

    html += `
      <div class="investment-summary">
        <div class="investment-title">
          Nifty Top-20 Diversified Investment Plan
        </div>

        <div style="margin-top:8px;">
          Budget:
          <strong>₹${formatMoney(amount)}</strong>
        </div>

        <div>
          Top 20 stocks considered:
          <strong>${top20.length}</strong>
        </div>

        <div>
          Estimated investment:
          <strong>₹${formatMoney(totalInvestment)}</strong>
        </div>

        <div>
          Remaining balance:
          <strong>₹${formatMoney(balance)}</strong>
        </div>
      </div>
    `;

    html += `
      <div style="
        overflow-x:auto;
        margin-top:14px;
      ">
        <table style="
          width:100%;
          border-collapse:collapse;
          font-size:13px;
        ">
          <thead>
            <tr>
              <th style="padding:8px;text-align:left;">#</th>
              <th style="padding:8px;text-align:left;">Stock</th>
              <th style="padding:8px;text-align:right;">Nifty Wt.</th>
              <th style="padding:8px;text-align:right;">Target ₹</th>
              <th style="padding:8px;text-align:right;">Qty</th>
              <th style="padding:8px;text-align:right;">Actual ₹</th>
              <th style="padding:8px;text-align:right;">Actual %</th>
            </tr>
          </thead>
          <tbody>
    `;

    selected.forEach(function (stock, index) {
      const actualPercent =
        amount > 0
          ? (stock.investment / amount) * 100
          : 0;

      const weightPercent =
        totalTop20Weight > 0
          ? (stock.niftyWeight /
              totalTop20Weight) *
            100
          : 0;

      html += `
        <tr style="
          border-top:1px solid #252d38;
        ">
          <td style="padding:8px;">
            ${index + 1}
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

          <td style="
            padding:8px;
            text-align:right;
          ">
            ${stock.niftyWeight.toFixed(2)}%
          </td>

          <td style="
            padding:8px;
            text-align:right;
          ">
            ₹${formatMoney(stock.targetAmount)}
          </td>

          <td style="
            padding:8px;
            text-align:right;
          ">
            ${stock.quantity}
          </td>

          <td style="
            padding:8px;
            text-align:right;
          ">
            ₹${formatMoney(stock.investment)}
          </td>

          <td style="
            padding:8px;
            text-align:right;
          ">
            ${weightPercent > 0
              ? actualPercent.toFixed(2)
              : "0.00"}%
          </td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </div>
    `;

    // =================================================
    // FULL TOP-20 REQUIREMENT
    // =================================================

    const theoreticalTop20Cost =
      calculateTheoreticalTop20Cost(
        top20,
        amount
      );

    html += `
      <div style="
        margin-top:16px;
        padding:12px;
        border:1px solid #252d38;
        border-radius:8px;
        line-height:1.7;
      ">
        <strong>
          Top-20 Weight Requirement
        </strong>

        <br>

        Agar current Top 20 ko unke
        Nifty weight ke proportion mein
        exactly allocate karna ho,
        to theoretical amount:

        <strong>
          ₹${formatMoney(theoreticalTop20Cost)}
        </strong>

        required hoga.

        <br>

        Aapka available budget:

        <strong>
          ₹${formatMoney(amount)}
        </strong>

        <br>

        Current whole-share allocation:

        <strong>
          ₹${formatMoney(totalInvestment)}
        </strong>

        <br>

        Balance:

        <strong>
          ₹${formatMoney(balance)}
        </strong>
      </div>
    `;

    html += `
      <p style="
        margin-top:14px;
        line-height:1.7;
      ">
        <strong>Allocation logic:</strong><br>
        Current Top 20 ko Nifty weight ke
        proportion mein target kiya gaya hai.
        Budget ke hisaab se whole shares calculate
        kiye gaye hain. Jitna budget afford karta hai,
        utne Top-20 stocks include kiye jaate hain.
        Fixed 2, 4 ya 5 stock selection rule use nahi
        kiya gaya hai.

        <br><br>

        Individual stock allocation maximum
        approximately 35% tak limited hai.

        <br><br>

        Actual investment entered budget se
        kabhi zyada nahi hoga.

        <br><br>

        Ye calculation live market data,
        Nifty-weight allocation aur prototype
        rules par based hai.
        Investment ka final decision aapka hai.
      </p>
    `;

    html += `
      <div style="
        margin-top:12px;
        font-size:12px;
        opacity:.8;
      ">
        Prototype-1 • AI analysis based on available data.
      </div>
    `;

    return html;
  }

  // ====================================================
  // THEORETICAL COST
  //
  // Iska matlab:
  // Agar available budget ko Top-20 weights ke
  // proportion mein theoretical allocation karna ho.
  //
  // Ye actual purchase cost nahi hai.
  // ====================================================

  function calculateTheoreticalTop20Cost(
    top20,
    amount
  ) {
    if (!top20.length) return 0;

    const totalWeight =
      top20.reduce(function (sum, stock) {
        return sum + stock.niftyWeight;
      }, 0);

    if (totalWeight <= 0) {
      return amount;
    }

    return amount;
  }

  // ====================================================
  // STATUS
  // ====================================================

  function setMarketStatus(
    text,
    className
  ) {
    const marketStatus =
      document.getElementById("marketStatus");

    if (!marketStatus) return;

    marketStatus.textContent = text;
    marketStatus.className = className;
  }

  // ====================================================
  // ERROR
  // ====================================================

  function showError(message) {
    const box =
      document.getElementById("errorBox");

    if (!box) return;

    box.textContent =
      String(message || "Unknown error");

    box.style.display = "block";
  }

  function hideError() {
    const box =
      document.getElementById("errorBox");

    if (!box) return;

    box.textContent = "";
    box.style.display = "none";
  }

  // ====================================================
  // MONEY
  // ====================================================

  function formatMoney(value) {
    return Number(value || 0).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );
  }

  // ====================================================
  // ESCAPE HTML
  // ====================================================

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  console.log(
    "Prototype-1 app.js loaded successfully."
  );
})();
