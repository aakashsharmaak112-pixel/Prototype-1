// ============================================
// PROTOTYPE-1
// APP ENGINE V2
// LIVE MARKET DATA + RANK WEIGHTED
// + PRACTICAL DIVERSIFICATION
// + WHOLE SHARE OPTIMIZATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js V2 loading...");


  // ==========================================
  // DIVERSIFICATION LIMITS
  // ==========================================

  // Hard safety limit
  const MAX_STOCK_ALLOCATION = 0.35;

  // Practical portfolio limit
  // Small budgets mein expensive stock ko
  // portfolio dominate karne se rokta hai.
  const PRACTICAL_MAX_STOCK = 0.20;

  const MAX_SECTOR_ALLOCATION = 0.40;
  const MAX_GROUP_ALLOCATION = 0.30;


  let isConnecting = false;


  // ==========================================
  // DOM READY
  // ==========================================

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


    // ========================================
    // CONNECT LIVE MARKET DATA
    // ========================================

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
              window.MARKET_DATA.received ||
              0
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
            error && error.message
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
              result && result.message
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
    // ENTER SUPPORT
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

  });


  // ==========================================
  // MAIN ANALYSIS
  // ==========================================

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


      // ----------------------------------------
      // LIVE STOCK DATA
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
      // LIVE RANKING
      // ----------------------------------------

      stocks.sort(function (a, b) {

        return b.change - a.change;

      });


      // ----------------------------------------
      // CURRENT TOP 20
      // ----------------------------------------

      const top20 =
        stocks.slice(0, 20);


      if (!top20.length) {

        return {

          success: false,

          message:
            "Current Top 20 market data available nahi hai."

        };

      }


      // ----------------------------------------
      // BUILD V2 PLAN
      // ----------------------------------------

      const result =
        buildTop20BudgetPlan(
          top20,
          amount
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
          result.selected,

        totalInvestment:
          result.totalInvestment,

        balance:
          result.balance,

        top20:
          top20

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
      Array.isArray(market.stocks)
    ) {

      return market.stocks;

    }


    if (
      typeof market.stocks !== "object"
    ) {

      return [];

    }


    const result = [];


    Object.keys(
      market.stocks
    ).forEach(function (key) {

      const item =
        market.stocks[key];


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
          0

      });

    });


    return result;

  }


  // ==========================================
  // NORMALIZE STOCK
  // ==========================================

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
        stock.parentGroup ||
        (
          master &&
          (
            master.businessGroup ||
            master.group
          )
        ) ||
        inferBusinessGroup(symbol)
      ).trim();


    return {

      symbol,
      name,
      sector,
      businessGroup,
      price,
      change

    };

  }


  // ==========================================
  // NIFTY MASTER LOOKUP
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

      const item =
        list[i];


      if (
        String(
          item.symbol || ""
        )
          .replace(/-EQ$/i, "")
          .toUpperCase() === symbol
      ) {

        return item;

      }

    }


    return null;

  }


  // ==========================================
  // BUSINESS GROUP FALLBACK
  // ==========================================

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
  // TOP 20 RENDER
  // ==========================================

  function renderTop20() {

    const list =
      document.getElementById(
        "top20List"
      );


    if (!list) return;


    const stocks =
      getStocksFromMarketData()
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


    stocks.forEach(
      function (stock, index) {

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
          String(index + 1);


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


  // ==========================================
  // V2 BUDGET PLAN
  // ==========================================

  function buildTop20BudgetPlan(
    stocks,
    budget
  ) {

    const count =
      stocks.length;


    // ----------------------------------------
    // RANK WEIGHTS
    // #1 = 20
    // #20 = 1
    // ----------------------------------------

    const rankWeights =
      stocks.map(
        function (stock, index) {

          return {

            symbol:
              stock.symbol,

            rank:
              index + 1,

            weight:
              count - index

          };

        }
      );


    const weightTotal =
      rankWeights.reduce(
        function (sum, item) {

          return (
            sum +
            item.weight
          );

        },
        0
      );


    // ----------------------------------------
    // TARGET PERCENT
    // ----------------------------------------

    const targets =
      {};


    rankWeights.forEach(
      function (item) {

        targets[item.symbol] =
          item.weight /
          weightTotal;

      }
    );


    // ----------------------------------------
    // CREATE ALL 20 STOCKS
    // ----------------------------------------

    const selected =
      stocks.map(
        function (stock, index) {

          const targetPercent =
            targets[stock.symbol];


          return {

            ...stock,

            rank:
              index + 1,

            rankWeight:
              rankWeights[index].weight,

            targetPercent:
              targetPercent * 100,

            targetAmount:
              budget *
              targetPercent,

            quantity:
              0,

            investment:
              0,

            actualPercent:
              0,

            sectorPercent:
              0,

            groupPercent:
              0

          };

        }
      );


    // ----------------------------------------
    // ALLOCATION
    //
    // Start from zero.
    // Every next share is selected according
    // to:
    //
    // 1. Rank target gap
    // 2. Diversification
    // 3. Price affordability
    // 4. Concentration limits
    // ----------------------------------------

    let total = 0;

    let balance = budget;

    let guard = 0;


    while (
      balance > 0 &&
      guard < 10000
    ) {

      guard++;


      const candidates =
        selected
          .filter(function (stock) {

            return canAddShare(
              stock,
              selected,
              budget,
              balance,
              total
            );

          })
          .map(function (stock) {

            return {

              stock,

              score:
                calculateAllocationScore(
                  stock,
                  selected,
                  budget,
                  total
                )

            };

          })
          .sort(
            function (a, b) {

              return (
                b.score -
                a.score
              );

            }
          );


      if (!candidates.length) {
        break;
      }


      const chosen =
        candidates[0].stock;


      chosen.quantity += 1;


      chosen.investment +=
        chosen.price;


      total +=
        chosen.price;


      balance =
        Math.max(
          0,
          budget - total
        );

    }


    // ----------------------------------------
    // SECOND PASS
    //
    // If practical 20% limit prevents some
    // expensive shares, use remaining money
    // only where safe.
    // ----------------------------------------

    let secondPassGuard = 0;


    while (
      balance > 0 &&
      secondPassGuard < 5000
    ) {

      secondPassGuard++;


      const candidates =
        selected
          .filter(function (stock) {

            return canAddShare(
              stock,
              selected,
              budget,
              balance,
              total
            );

          })
          .map(function (stock) {

            return {

              stock,

              score:
                calculateAllocationScore(
                  stock,
                  selected,
                  budget,
                  total
                )

            };

          })
          .sort(
            function (a, b) {

              return (
                b.score -
                a.score
              );

            }
          );


      if (!candidates.length) {
        break;
      }


      const chosen =
        candidates[0].stock;


      chosen.quantity += 1;

      chosen.investment +=
        chosen.price;


      total +=
        chosen.price;


      balance =
        Math.max(
          0,
          budget - total
        );

    }


    // ----------------------------------------
    // CALCULATE FINAL CONCENTRATION
    // ----------------------------------------

    calculateConcentration(
      selected,
      total
    );


    // ----------------------------------------
    // FINAL TARGET GAP
    // ----------------------------------------

    selected.forEach(
      function (stock) {

        stock.targetGap =
          stock.targetAmount -
          stock.investment;

      }
    );


    return {

      selected,

      totalInvestment:
        total,

      balance,

      top20Count:
        count,

      targetPercentages:
        targets,

      rankWeights,

      weightTotal,

      sectorTotals:
        getSectorTotals(selected),

      groupTotals:
        getGroupTotals(selected)

    };

  }


  // ==========================================
  // CAN ADD SHARE?
  // ==========================================

  function canAddShare(
    stock,
    selected,
    budget,
    balance,
    total
  ) {

    const price =
      stock.price;


    if (
      !Number.isFinite(price) ||
      price <= 0
    ) {

      return false;

    }


    if (
      price > balance
    ) {

      return false;

    }


    const nextInvestment =
      stock.investment +
      price;


    // ----------------------------------------
    // HARD STOCK LIMIT
    // ----------------------------------------

    const hardMax =
      budget *
      MAX_STOCK_ALLOCATION;


    if (
      nextInvestment >
      hardMax
    ) {

      return false;

    }


    // ----------------------------------------
    // PRACTICAL STOCK LIMIT
    //
    // Prevent one expensive share from
    // dominating a small portfolio.
    // ----------------------------------------

    const practicalMax =
      budget *
      PRACTICAL_MAX_STOCK;


    if (
      nextInvestment >
      practicalMax
    ) {

      return false;

    }


    // ----------------------------------------
    // PROJECTED SECTOR LIMIT
    // ----------------------------------------

    const sectorTotals =
      getSectorTotals(
        selected
      );


    const sector =
      stock.sector ||
      "Nifty 50";


    const nextSector =
      (
        sectorTotals[sector] ||
        0
      ) +
      price;


    if (
      nextSector >
      budget *
      MAX_SECTOR_ALLOCATION
    ) {

      return false;

    }


    // ----------------------------------------
    // PROJECTED GROUP LIMIT
    // ----------------------------------------

    const groupTotals =
      getGroupTotals(
        selected
      );


    const group =
      stock.businessGroup ||
      stock.symbol;


    const nextGroup =
      (
        groupTotals[group] ||
        0
      ) +
      price;


    if (
      nextGroup >
      budget *
      MAX_GROUP_ALLOCATION
    ) {

      return false;

    }


    return true;

  }


  // ==========================================
  // ALLOCATION SCORE
  // ==========================================

  function calculateAllocationScore(
    stock,
    selected,
    budget,
    total
  ) {

    const target =
      stock.targetAmount;


    const current =
      stock.investment;


    // ----------------------------------------
    // TARGET GAP
    // ----------------------------------------

    const gap =
      Math.max(
        0,
        target - current
      );


    const gapRatio =
      target > 0
        ? gap / target
        : 0;


    // ----------------------------------------
    // RANK PRIORITY
    // ----------------------------------------

    const rankScore =
      (
        stock.rankWeight /
        Math.max(
          1,
          selected.length
        )
      );


    // ----------------------------------------
    // AFFORDABILITY
    // ----------------------------------------

    const affordability =
      budget > 0
        ? Math.min(
            1,
            budget /
            (
              stock.price *
              10
            )
          )
        : 0;


    // ----------------------------------------
    // UNDER-ALLOCATED BONUS
    // ----------------------------------------

    let bonus = 0;


    if (
      stock.investment === 0
    ) {

      bonus += 0.35;

    }


    // ----------------------------------------
    // DIVERSIFICATION BONUS
    //
    // Prefer sectors/groups which are not
    // already heavily allocated.
    // ----------------------------------------

    const sectorTotals =
      getSectorTotals(
        selected
      );


    const groupTotals =
      getGroupTotals(
        selected
      );


    const currentSector =
      sectorTotals[
        stock.sector ||
        "Nifty 50"
      ] || 0;


    const currentGroup =
      groupTotals[
        stock.businessGroup ||
        stock.symbol
      ] || 0;


    const sectorRatio =
      currentSector /
      Math.max(
        budget,
        1
      );


    const groupRatio =
      currentGroup /
      Math.max(
        budget,
        1
      );


    const diversificationBonus =
      (
        1 -
        sectorRatio
      ) +
      (
        1 -
        groupRatio
      );


    // ----------------------------------------
    // FINAL SCORE
    // ----------------------------------------

    return (

      gapRatio * 5

      +

      rankScore * 2

      +

      affordability * 0.5

      +

      diversificationBonus * 0.4

      +

      bonus

    );

  }


  // ==========================================
  // SECTOR TOTALS
  // ==========================================

  function getSectorTotals(
    stocks
  ) {

    const totals = {};


    stocks.forEach(
      function (stock) {

        const sector =
          stock.sector ||
          "Nifty 50";


        totals[sector] =
          (
            totals[sector] ||
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


  // ==========================================
  // GROUP TOTALS
  // ==========================================

  function getGroupTotals(
    stocks
  ) {

    const totals = {};


    stocks.forEach(
      function (stock) {

        const group =
          stock.businessGroup ||
          stock.symbol;


        totals[group] =
          (
            totals[group] ||
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


  // ==========================================
  // CONCENTRATION
  // ==========================================

  function calculateConcentration(
    stocks,
    total
  ) {

    const sectorTotals =
      getSectorTotals(
        stocks
      );


    const groupTotals =
      getGroupTotals(
        stocks
      );


    stocks.forEach(
      function (stock) {

        stock.actualPercent =
          total > 0
            ? (
                stock.investment /
                total
              ) *
              100
            : 0;


        const sector =
          stock.sector ||
          "Nifty 50";


        const group =
          stock.businessGroup ||
          stock.symbol;


        stock.sectorPercent =
          total > 0
            ? (
                (
                  sectorTotals[
                    sector
                  ] || 0
                ) /
                total
              ) *
              100
            : 0;


        stock.groupPercent =
          total > 0
            ? (
                (
                  groupTotals[
                    group
                  ] || 0
                ) /
                total
              ) *
              100
            : 0;

      }
    );

  }


  // ==========================================
  // RECOMMENDATION HTML
  // ==========================================

  function buildRecommendationHTML(
    budget,
    top20,
    result
  ) {

    let html = "";


    // ========================================
    // SUMMARY
    // ========================================

    html +=
      `<div
        class="investment-summary"
        style="
          padding:14px;
          margin-bottom:14px;
          border-radius:10px;
          background:#111820;
        "
      >`;


    html +=
      `<div class="investment-title">
        Top 20 Rank-Weighted Practical
        Diversification Plan
      </div>`;


    html +=
      `<div
        style="
          line-height:1.8;
          margin-top:8px;
        "
      >`;


    html +=
      `Budget:
      <strong>
        ₹${formatMoney(budget)}
      </strong>
      <br>`;


    html +=
      `Current Top 20:
      <strong>
        ${top20.length} companies
      </strong>
      <br>`;


    html +=
      `Allocation method:
      <strong>
        Live Rank-Weighted %
      </strong>
      <br>`;


    html +=
      `Rank weight:
      <strong>
        #1 = ${top20.length}
        → #${top20.length} = 1
      </strong>
      <br>`;


    html +=
      `Practical stock limit:
      <strong>
        ${(PRACTICAL_MAX_STOCK * 100).toFixed(0)}%
      </strong>
      <br>`;


    html +=
      `Actual whole-share investment:
      <strong>
        ₹${formatMoney(
          result.totalInvestment
        )}
      </strong>
      <br>`;


    html +=
      `Remaining balance:
      <strong>
        ₹${formatMoney(
          result.balance
        )}
      </strong>`;


    html +=
      `</div>`;


    html +=
      `</div>`;


    // ========================================
    // TABLE
    // ========================================

    html +=
      `<div
        style="
          overflow-x:auto;
          margin-top:12px;
        "
      >`;


    html +=
      `<table
        style="
          width:100%;
          border-collapse:collapse;
          min-width:1100px;
          font-size:13px;
        "
      >`;


    html +=
      `<thead>
        <tr>`;


    const headers = [

      "Rank",

      "Company",

      "Price",

      "Rank Weight",

      "Target %",

      "Target ₹",

      "Shares",

      "Actual ₹",

      "Actual %",

      "Sector",

      "Sector %",

      "Group",

      "Group %"

    ];


    headers.forEach(
      function (header) {

        html +=
          `<th
            style="
              text-align:left;
              padding:9px;
              border-bottom:
                1px solid #39424e;
              white-space:nowrap;
            "
          >
            ${header}
          </th>`;

      }
    );


    html +=
      `</tr>
      </thead>`;


    html +=
      `<tbody>`;


    result.selected.forEach(
      function (stock) {

        const actualClass =
          stock.quantity > 0
            ? "positive"
            : "negative";


        html +=
          `<tr>`;


        // Rank
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.rank}
          </td>`;


        // Company
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
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
          </td>`;


        // Price
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ₹${formatMoney(
              stock.price
            )}
          </td>`;


        // Rank Weight
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.rankWeight}
          </td>`;


        // Target %
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.targetPercent.toFixed(2)}%
          </td>`;


        // Target ₹
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ₹${formatMoney(
              stock.targetAmount
            )}
          </td>`;


        // Shares
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            <strong>
              ${stock.quantity}
            </strong>
          </td>`;


        // Actual ₹
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ₹${formatMoney(
              stock.investment
            )}
          </td>`;


        // Actual %
        html +=
          `<td
            class="${actualClass}"
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.actualPercent.toFixed(2)}%
          </td>`;


        // Sector
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${escapeHtml(
              stock.sector
            )}
          </td>`;


        // Sector %
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.sectorPercent.toFixed(2)}%
          </td>`;


        // Group
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${escapeHtml(
              stock.businessGroup
            )}
          </td>`;


        // Group %
        html +=
          `<td
            style="
              padding:8px;
              border-bottom:
                1px solid #252d38;
            "
          >
            ${stock.groupPercent.toFixed(2)}%
          </td>`;


        html +=
          `</tr>`;

      }
    );


    html +=
      `</tbody>
      </table>
      </div>`;


    // ========================================
    // ALLOCATION LOGIC
    // ========================================

    html +=
      `<div
        style="
          margin-top:16px;
          padding:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.7;
        "
      >`;


    html +=
      `<strong>
        Allocation logic
      </strong>
      <br>`;


    html +=
      `• Equal 5% allocation use nahi ki gayi.
      <br>`;


    html +=
      `• Current Top 20 ko live ranking ke
      basis par progressively weighted target
      diya gaya hai.
      <br>`;


    html +=
      `• Rank #1 ko highest weight aur lower
      ranks ko progressively lower weight milta hai.
      <br>`;


    html +=
      `• Whole-share allocation ke waqt
      stock, sector aur business-group
      concentration limits enforce hoti hain.
      <br>`;


    html +=
      `• Practical stock limit
      <strong>
        ${(PRACTICAL_MAX_STOCK * 100).toFixed(0)}%
      </strong>
      rakhi gayi hai, taaki ek expensive
      share small portfolio ko dominate na kare.
      <br>`;


    html +=
      `• Hard individual-stock safety limit
      <strong>
        ${(MAX_STOCK_ALLOCATION * 100).toFixed(0)}%
      </strong>
      se upar nahi jaane diya gaya.
      <br>`;


    html +=
      `• Kisi sector ko
      <strong>
        ${(MAX_SECTOR_ALLOCATION * 100).toFixed(0)}%
      </strong>
      se upar nahi jaane diya gaya.
      <br>`;


    html +=
      `• Kisi business group ko
      <strong>
        ${(MAX_GROUP_ALLOCATION * 100).toFixed(0)}%
      </strong>
      se upar nahi jaane diya gaya.
      <br>`;


    html +=
      `• Remaining balance ko affordable
      valid whole-share candidates mein
      target-gap aur diversification ke basis
      par use karne ki koshish hoti hai.
      <br>`;


    html +=
      `• Total investment entered budget
      se kabhi zyada nahi hoga.
      <br>`;


    html +=
      `• Agar kisi expensive stock ka ek share
      practical limit cross karta hai, to engine
      us share ko force nahi karega.
      <br>`;


    html +=
      `• Ye live market data aur prototype
      allocation rules par based calculation hai;
      investment decision final nahi hai.`;


    html +=
      `</div>`;


    // ========================================
    // FINAL SUMMARY
    // ========================================

    html +=
      `<div
        style="
          margin-top:14px;
          padding:14px;
          border-top:
            1px solid #39424e;
          line-height:1.8;
        "
      >`;


    html +=
      `<strong>
        Final Summary
      </strong>
      <br>`;


    html +=
      `Budget:
      ₹${formatMoney(
        budget
      )}
      <br>`;


    html +=
      `Invested:
      ₹${formatMoney(
        result.totalInvestment
      )}
      <br>`;


    html +=
      `Balance:
      ₹${formatMoney(
        result.balance
      )}
      <br>`;


    html +=
      `Top-20 companies considered:
      ${result.top20Count}
      <br>`;


    html +=
      `Allocation:
      Rank-Weighted +
      Practical Diversification
      <br>`;


    html +=
      `Practical stock limit:
      ${(PRACTICAL_MAX_STOCK * 100).toFixed(0)}%
      <br>`;


    html +=
      `Sector limit:
      ${(MAX_SECTOR_ALLOCATION * 100).toFixed(0)}%
      <br>`;


    html +=
      `Group limit:
      ${(MAX_GROUP_ALLOCATION * 100).toFixed(0)}%`;


    html +=
      `</div>`;


    html +=
      `<div
        style="
          margin-top:12px;
          font-size:12px;
          opacity:0.8;
        "
      >
        Prototype-1 AI analysis based on available data.
        Investment ka final decision aapka hai.
      </div>`;


    return html;

  }


  // ==========================================
  // STATUS
  // ==========================================

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


  // ==========================================
  // ERROR
  // ==========================================

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


  // ==========================================
  // MONEY
  // ==========================================

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


  // ==========================================
  // HTML ESCAPE
  // ==========================================

  function escapeHtml(value) {

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


  console.log(
    "Prototype-1 app.js V2 loaded successfully."
  );

})();
