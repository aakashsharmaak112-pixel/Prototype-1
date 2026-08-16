// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + SMART ALLOCATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  // ==========================================
  // CONFIG
  // ==========================================

  const MAX_STOCK_ALLOCATION = 0.35;
  const MAX_GROUP_ALLOCATION = 0.30;
  const MAX_SECTOR_ALLOCATION = 0.40;

  let isConnecting = false;


  // ==========================================
  // DOM READY
  // ==========================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      bindApp();

    }
  );


  // ==========================================
  // BIND APP
  // ==========================================

  function bindApp() {

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


    if (
      connectButton.dataset.bound === "true"
    ) {

      return;

    }


    connectButton.dataset.bound = "true";


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

          connectButton.disabled = false;
          analyzeButton.disabled = false;

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


          recommendation.innerHTML =
            result &&
            result.success
              ? result.html
              : (
                  result &&
                  result.message
                )
                  ? result.message
                  : "Investment analysis available nahi hai.";

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


      // Current Top 20
      stocks =
        stocks
          .sort(
            function (a, b) {

              return b.change - a.change;

            }
          )
          .slice(0, 20);


      const selected =
        buildSmartPortfolio(
          stocks,
          amount
        );


      if (!selected.length) {

        return {

          success: false,

          message:
            "Current Top 20 mein is budget ke andar whole-share allocation nahi ban paaya."

        };

      }


      let total =
        selected.reduce(
          function (sum, stock) {

            return sum +
              stock.investment;

          },
          0
        );


      // HARD SAFETY
      if (
        total > amount
      ) {

        console.error(
          "Budget safety failed."
        );

        return {

          success: false,

          message:
            "Safe budget allocation generate nahi ho paya."

        };

      }


      total =
        Math.min(
          total,
          amount
        );


      const balance =
        Math.max(
          0,
          amount - total
        );


      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            selected,
            total,
            balance
          ),

        selectedStocks:
          selected,

        totalInvestment:
          total,

        balance:
          balance

      };

    };


  // ==========================================
  // GET MARKET STOCKS
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


    return Object.keys(
      market.stocks
    )
      .map(
        function (key) {

          const item =
            market.stocks[key];


          if (!item) {
            return null;
          }


          return {

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
              item.business_group ||
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
              0

          };

        }
      )
      .filter(Boolean);

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
      ).trim();


    return {

      symbol:
        symbol,

      name:
        name,

      sector:
        sector,

      businessGroup:
        getBusinessGroup(
          stock,
          master,
          symbol,
          name
        ),

      price:
        price,

      change:
        change

    };

  }


  // ==========================================
  // BUSINESS GROUP
  // ==========================================

  function getBusinessGroup(
    stock,
    master,
    symbol,
    name
  ) {

    const direct =
      stock.businessGroup ||
      stock.business_group ||
      stock.group ||
      (
        master &&
        (
          master.businessGroup ||
          master.business_group ||
          master.group
        )
      );


    if (direct) {

      return String(
        direct
      )
        .trim()
        .toUpperCase();

    }


    const text =
      `${symbol} ${name}`
        .toUpperCase();


    // Known Nifty business groups
    if (
      /ADANIENT|ADANIPORTS|ADANIPOWER|ADANIGREEN|ADANIENSOL|AMBUJACEM|ACC/.test(text)
    ) {

      return "ADANI GROUP";

    }


    if (
      /RELIANCE|JIO|NETWORK18/.test(text)
    ) {

      return "RELIANCE GROUP";

    }


    if (
      /TATAMOTORS|TATASTEEL|TATACONSUM|TATAPOWER|TATAELXSI|TCS|TRENT|TITAN/.test(text)
    ) {

      return "TATA GROUP";

    }


    if (
      /HDFCBANK|HDFCLIFE|HDFCAMC/.test(text)
    ) {

      return "HDFC GROUP";

    }


    if (
      /ICICIBANK|ICICIPRULI|ICICIGI/.test(text)
    ) {

      return "ICICI GROUP";

    }


    if (
      /SBIN|SBILIFE/.test(text)
    ) {

      return "SBI GROUP";

    }


    if (
      /BHARTIARTL|INDUSTOWER/.test(text)
    ) {

      return "BHARTI GROUP";

    }


    if (
      /ITC/.test(text)
    ) {

      return "ITC GROUP";

    }


    // Unknown group = stock-specific group
    return symbol || "UNKNOWN";

  }


  // ==========================================
  // FIND NIFTY STOCK
  // ==========================================

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

      const current =
        String(
          list[i].symbol ||
          ""
        )
          .replace(
            /-EQ$/i,
            ""
          )
          .trim()
          .toUpperCase();


      if (
        current === symbol
      ) {

        return list[i];

      }

    }


    return null;

  }


  // ==========================================
  // VALID STOCK
  // ==========================================

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


  // ==========================================
  // RENDER TOP 20
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
          index + 1;


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


    const affordable =
      stocks.filter(
        function (stock) {

          return stock.price <= amount;

        }
      );


    if (!affordable.length) {
      return [];
    }


    // Target count
    let targetCount;


    if (amount < 5000) {
      targetCount = 2;
    }

    else if (amount < 10000) {
      targetCount = 3;
    }

    else if (amount < 20000) {
      targetCount = 4;
    }

    else if (amount < 35000) {
      targetCount = 5;
    }

    else if (amount < 50000) {
      targetCount = 6;
    }

    else if (amount < 75000) {
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


    const maxStock =
      amount *
      MAX_STOCK_ALLOCATION;


    const maxGroup =
      amount *
      MAX_GROUP_ALLOCATION;


    const maxSector =
      amount *
      MAX_SECTOR_ALLOCATION;


    // Rank candidates
    const candidates =
      affordable
        .map(
          function (
            stock,
            index
          ) {

            let score =
              stock.change;


            // Small Top-20 ranking bonus
            score +=
              Math.max(
                0,
                20 - index
              ) * 0.02;


            // Avoid extremely expensive stock
            if (
              stock.price >
              amount * 0.45
            ) {

              score -= 0.35;

            }


            return {
              ...stock,
              score: score
            };

          }
        )
        .sort(
          function (a, b) {

            return b.score - a.score;

          }
        );


    const selected =
      [];


    const groupTotals =
      new Map();


    const sectorTotals =
      new Map();


    let total =
      0;


    // ========================================
    // PASS 1
    // DIFFERENT GROUPS/SECTORS FIRST
    // ========================================

    for (
      let i = 0;
      i < candidates.length &&
      selected.length < targetCount;
      i++
    ) {

      const stock =
        candidates[i];


      const group =
        normalizeKey(
          stock.businessGroup
        );


      const sector =
        normalizeKey(
          stock.sector
        );


      const currentGroup =
        groupTotals.get(group) || 0;


      const currentSector =
        sectorTotals.get(sector) || 0;


      const remaining =
        amount - total;


      if (
        remaining < stock.price
      ) {

        continue;

      }


      const allowed =
        Math.min(
          remaining,
          maxStock,
          maxGroup - currentGroup,
          maxSector - currentSector
        );


      const quantity =
        Math.floor(
          allowed / stock.price
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      const investment =
        quantity * stock.price;


      if (
        total + investment > amount
      ) {

        continue;

      }


      addPosition(
        selected,
        stock,
        quantity,
        investment
      );


      total +=
        investment;


      groupTotals.set(
        group,
        currentGroup + investment
      );


      sectorTotals.set(
        sector,
        currentSector + investment
      );

    }


    // ========================================
    // PASS 2
    // FILL EMPTY SLOTS
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
        selected.some(
          function (item) {

            return item.symbol ===
              stock.symbol;

          }
        )
      ) {

        continue;

      }


      const group =
        normalizeKey(
          stock.businessGroup
        );


      const sector =
        normalizeKey(
          stock.sector
        );


      const currentGroup =
        groupTotals.get(group) || 0;


      const currentSector =
        sectorTotals.get(sector) || 0;


      const remaining =
        amount - total;


      if (
        remaining < stock.price
      ) {

        continue;

      }


      const allowed =
        Math.min(
          remaining,
          maxStock,
          maxGroup - currentGroup,
          maxSector - currentSector
        );


      const quantity =
        Math.floor(
          allowed / stock.price
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      const investment =
        quantity * stock.price;


      if (
        total + investment > amount
      ) {

        continue;

      }


      addPosition(
        selected,
        stock,
        quantity,
        investment
      );


      total +=
        investment;


      groupTotals.set(
        group,
        currentGroup + investment
      );


      sectorTotals.set(
        sector,
        currentSector + investment
      );

    }


    // ========================================
    // PASS 3
    // USE REMAINING BALANCE
    // ========================================

    let balance =
      amount - total;


    let changed =
      true;


    while (
      changed &&
      balance > 0
    ) {

      changed =
        false;


      const ordered =
        selected
          .slice()
          .sort(
            function (a, b) {

              return b.score - a.score;

            }
          );


      for (
        let i = 0;
        i < ordered.length;
        i++
      ) {

        const stock =
          ordered[i];


        const group =
          normalizeKey(
            stock.businessGroup
          );


        const sector =
          normalizeKey(
            stock.sector
          );


        const currentGroup =
          groupTotals.get(group) || 0;


        const currentSector =
          sectorTotals.get(sector) || 0;


        const allowed =
          Math.min(
            balance,
            maxStock - stock.investment,
            maxGroup - currentGroup,
            maxSector - currentSector
          );


        if (
          allowed <
          stock.price
        ) {

          continue;

        }


        stock.quantity += 1;

        stock.investment +=
          stock.price;


        total +=
          stock.price;


        balance -=
          stock.price;


        groupTotals.set(
          group,
          currentGroup +
          stock.price
        );


        sectorTotals.set(
          sector,
          currentSector +
          stock.price
        );


        changed =
          true;


        break;

      }

    }


    // ========================================
    // FINAL SAFETY
    // ========================================

    if (
      total > amount
    ) {

      return [];

    }


    return selected;

  }


  // ==========================================
  // ADD POSITION
  // ==========================================

  function addPosition(
    selected,
    stock,
    quantity,
    investment
  ) {

    selected.push({

      ...stock,

      quantity:
        quantity,

      investment:
        investment

    });

  }


  // ==========================================
  // NORMALIZE KEY
  // ==========================================

  function normalizeKey(
    value
  ) {

    return String(
      value || "UNKNOWN"
    )
      .trim()
      .toUpperCase() ||
      "UNKNOWN";

  }


  // ==========================================
  // RECOMMENDATION
  // ==========================================

  function buildRecommendationHTML(
    amount,
    selected,
    total,
    balance
  ) {

    let html = "";


    html +=
      `<div class="investment-summary">`;

    html +=
      `<div class="investment-title">Investment Plan</div>`;

    html +=
      `Amount: ₹${formatMoney(amount)}`;

    html += `<br>`;

    html +=
      `Selected Stocks: ${selected.length}`;

    html += `<br>`;

    html +=
      `Estimated Investment: ₹${formatMoney(total)}`;

    html += `<br>`;

    html +=
      `Balance: ₹${formatMoney(balance)}`;

    html +=
      `</div>`;


    selected.forEach(
      function (
        stock,
        index
      ) {

        const cls =
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


        html += `<br>`;


        html +=
          `<span>${escapeHtml(stock.symbol)}</span>`;


        html += `<br>`;


        html +=
          `<span>${stock.quantity} share${stock.quantity > 1 ? "s" : ""}</span>`;


        html +=
          `<span style="margin-left:8px;" class="${cls}">`;


        html +=
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;


        html += `</span>`;


        html += `<br>`;


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
      `₹${formatMoney(amount)} ke liye current Top 20 mein se ${selected.length} stock(s) ka whole-share diversified allocation calculate kiya gaya hai.`;


    html += `<br>`;


    html +=
      `Individual stock limit ~35%, business-group limit ~30% aur sector limit ~40% rakhi gayi hai.`;


    html += `<br>`;


    html +=
      `Total estimated investment ₹${formatMoney(total)} hai aur ₹${formatMoney(balance)} balance bacha hai.`;


    html += `<br>`;


    html +=
      `Total investment entered amount se zyada nahi ho sakta.`;


    html += `<br>`;


    html +=
      `Ye calculation live market data aur prototype diversification rules par based hai. Investment ka final decision aapka hai.`;


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

    const element =
      document.getElementById(
        "marketStatus"
      );


    if (!element) {
      return;
    }


    element.textContent =
      text;


    element.className =
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
  // MONEY
  // ==========================================

  function formatMoney(
    value
  ) {

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


  // ==========================================
  // ESCAPE HTML
  // ==========================================

  function escapeHtml(
    value
  ) {

    return String(
      value || ""
    )
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
