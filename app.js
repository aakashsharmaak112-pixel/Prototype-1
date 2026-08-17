// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + TOP 20 + AI RECOMMENDATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");

  const MAX_STOCK_ALLOCATION = 0.35;
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
            await window.fetchMarketData(totp);


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
      // GET LIVE STOCKS
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

      stocks.sort(
        function (a, b) {

          return b.change - a.change;

        }
      );


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
      // EQUAL TOP-20 ALLOCATION
      // ----------------------------------------

      const allocation =
        buildTop20BudgetPlan(
          top20,
          amount
        );


      // ----------------------------------------
      // AI ANALYSIS
      // ----------------------------------------

      const aiAnalysis =
        buildAIAnalysis(
          top20,
          allocation,
          amount
        );


      return {

        success: true,

        html:
          buildRecommendationHTML(
            amount,
            top20,
            allocation,
            aiAnalysis
          ),

        selectedStocks:
          allocation.selected,

        totalInvestment:
          allocation.totalInvestment,

        balance:
          allocation.balance,

        top20:
          top20,

        aiAnalysis:
          aiAnalysis

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


    const result = [];


    Object.keys(
      market.stocks
    ).forEach(
      function (key) {

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

      }
    );


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
        list[i];


      if (

        String(
          item.symbol || ""
        )
          .replace(
            /-EQ$/i,
            ""
          )
          .toUpperCase() ===
        symbol

      ) {

        return item;

      }

    }


    return null;

  }


  // ==========================================
  // BUSINESS GROUP
  // ==========================================

  function inferBusinessGroup(
    symbol
  ) {

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


    if (!list) return;


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
          `₹${formatMoney(
            stock.price
          )}`;


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
  // EQUAL TOP-20 BUDGET PLAN
  // ==========================================

  function buildTop20BudgetPlan(
    stocks,
    budget
  ) {

    const count =
      stocks.length;


    const equalPercent =
      100 / count;


    const selected = [];


    stocks.forEach(
      function (stock) {

        const targetAmount =
          budget *
          (
            equalPercent /
            100
          );


        const quantity =
          Math.floor(
            targetAmount /
            stock.price
          );


        selected.push({

          ...stock,

          targetPercent:
            equalPercent,

          targetAmount:
            targetAmount,

          quantity:
            quantity > 0
              ? quantity
              : 0,

          investment:
            quantity > 0
              ? quantity *
                stock.price
              : 0

        });

      }
    );


    let total =
      calculateTotal(
        selected
      );


    let balance =
      Math.max(
        0,
        budget - total
      );


    let guard = 0;


    // ----------------------------------------
    // USE REMAINING BALANCE
    // ----------------------------------------

    while (

      balance > 0 &&
      guard < 10000

    ) {

      guard++;


      const candidates =
        selected

          .filter(
            function (stock) {

              const nextCost =
                stock.price;


              const nextInvestment =
                stock.investment +
                nextCost;


              const maxStock =
                budget *
                MAX_STOCK_ALLOCATION;


              return (

                nextCost <= balance &&

                nextInvestment <=
                maxStock

              );

            }
          )

          .sort(
            function (a, b) {

              const aGap =
                a.targetAmount -
                a.investment;


              const bGap =
                b.targetAmount -
                b.investment;


              if (
                bGap !==
                aGap
              ) {

                return (
                  bGap -
                  aGap
                );

              }


              return (
                b.change -
                a.change
              );

            }
          );


      if (
        !candidates.length
      ) {

        break;

      }


      const chosen =
        candidates[0];


      chosen.quantity +=
        1;


      chosen.investment +=
        chosen.price;


      total +=
        chosen.price;


      balance -=
        chosen.price;

    }


    // ----------------------------------------
    // SECTOR / GROUP TOTALS
    // ----------------------------------------

    const sectorTotals = {};
    const groupTotals = {};


    selected.forEach(
      function (stock) {

        const sector =
          stock.sector ||
          "Nifty 50";


        const group =
          stock.businessGroup ||
          stock.symbol;


        sectorTotals[sector] =
          (
            sectorTotals[sector] ||
            0
          ) +
          stock.investment;


        groupTotals[group] =
          (
            groupTotals[group] ||
            0
          ) +
          stock.investment;

      }
    );


    selected.forEach(
      function (stock) {

        stock.actualPercent =
          total > 0
            ? (
                stock.investment /
                total
              ) *
              100
            : 0;


        stock.sectorPercent =
          total > 0

            ? (

                (
                  sectorTotals[
                    stock.sector ||
                    "Nifty 50"
                  ] ||
                  0
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
                    stock.businessGroup ||
                    stock.symbol
                  ] ||
                  0
                ) /
                total

              ) *
              100

            : 0;

      }
    );


    return {

      selected,

      totalInvestment:
        total,

      balance,

      top20Count:
        count,

      equalPercent,

      equalAmount:
        budget,

      sectorTotals,

      groupTotals

    };

  }


  // ==========================================
  // AI RECOMMENDATION ENGINE
  // ==========================================

  function buildAIAnalysis(
    stocks,
    allocation,
    budget
  ) {

    const scored =
      stocks.map(
        function (
          stock,
          index
        ) {

          const rank =
            index + 1;


          const positionScore =
            calculatePositionScore(
              rank
            );


          const momentumScore =
            calculateMomentumScore(
              stock.change
            );


          const allocationData =
            allocation.selected.find(
              function (item) {

                return (
                  item.symbol ===
                  stock.symbol
                );

              }
            );


          const diversificationScore =
            calculateDiversificationScore(
              allocationData
            );


          const score =
            Math.round(

              positionScore +
              momentumScore +
              diversificationScore

            );


          let action =
            "WATCH";


          if (
            score >= 75
          ) {

            action =
              "BUY";

          }

          else if (
            score < 50
          ) {

            action =
              "AVOID";

          }


          const reason =
            getAIReason(
              stock,
              action,
              allocationData
            );


          return {

            symbol:
              stock.symbol,

            name:
              stock.name,

            sector:
              stock.sector,

            businessGroup:
              stock.businessGroup,

            price:
              stock.price,

            change:
              stock.change,

            rank,

            score,

            action,

            reason,

            positionScore,

            momentumScore,

            diversificationScore

          };

        }
      );


    scored.sort(
      function (a, b) {

        if (
          b.score !==
          a.score
        ) {

          return (
            b.score -
            a.score
          );

        }


        return (
          b.change -
          a.change
        );

      }
    );


    const buy =
      scored.filter(
        function (item) {

          return (
            item.action ===
            "BUY"
          );

        }
      );


    const watch =
      scored.filter(
        function (item) {

          return (
            item.action ===
            "WATCH"
          );

        }
      );


    const avoid =
      scored.filter(
        function (item) {

          return (
            item.action ===
            "AVOID"
          );

        }
      );


    return {

      scored,

      buy,

      watch,

      avoid,

      buyCount:
        buy.length,

      watchCount:
        watch.length,

      avoidCount:
        avoid.length,

      budget,

      model:
        "Prototype live-market scoring"

    };

  }


  // ==========================================
  // POSITION SCORE
  // ==========================================

  function calculatePositionScore(
    rank
  ) {

    return Math.max(
      0,
      30 -
      (
        (rank - 1) *
        1.5
      )
    );

  }


  // ==========================================
  // MOMENTUM SCORE
  // ==========================================

  function calculateMomentumScore(
    change
  ) {

    return clamp(

      20 +
      (
        change *
        6
      ),

      0,
      40

    );

  }


  // ==========================================
  // DIVERSIFICATION SCORE
  // ==========================================

  function calculateDiversificationScore(
    stock
  ) {

    if (!stock) {

      return 15;

    }


    let score =
      30;


    if (
      stock.actualPercent >
      25
    ) {

      score -=
        12;

    }

    else if (
      stock.actualPercent >
      20
    ) {

      score -=
        8;

    }


    if (
      stock.sectorPercent >
      MAX_SECTOR_ALLOCATION *
      100
    ) {

      score -=
        10;

    }

    else if (
      stock.sectorPercent >
      30
    ) {

      score -=
        5;

    }


    if (
      stock.groupPercent >
      MAX_GROUP_ALLOCATION *
      100
    ) {

      score -=
        10;

    }

    else if (
      stock.groupPercent >
      25
    ) {

      score -=
        5;

    }


    return clamp(
      score,
      0,
      30
    );

  }


  // ==========================================
  // AI REASON
  // ==========================================

  function getAIReason(
    stock,
    action,
    allocation
  ) {

    if (
      action ===
      "BUY"
    ) {

      if (
        stock.change >=
        2
      ) {

        return (
          "Strong live momentum with high current Top-20 position."
        );

      }


      if (
        stock.change >=
        0
      ) {

        return (
          "Positive/steady momentum with strong Top-20 position."
        );

      }


      return (
        "High Top-20 score with acceptable diversification."
      );

    }


    if (
      action ===
      "AVOID"
    ) {

      if (
        stock.change <
        0
      ) {

        return (
          "Negative live momentum and comparatively lower score."
        );

      }


      return (
        "Lower prototype score compared with current Top-20 stocks."
      );

    }


    if (
      allocation &&
      allocation.groupPercent >
      25
    ) {

      return (
        "WATCH due to business-group concentration."
      );

    }


    if (
      allocation &&
      allocation.sectorPercent >
      30
    ) {

      return (
        "WATCH due to sector concentration."
      );

    }


    return (
      "Monitor; current score is between BUY and AVOID thresholds."
    );

  }


  // ==========================================
  // RECOMMENDATION HTML
  // ==========================================

  function buildRecommendationHTML(
    budget,
    top20,
    result,
    ai
  ) {

    let html =
      "";


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
        Top 20 Diversification Plan
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
      `Equal Top-20 target:
      <strong>
        ${result.equalPercent.toFixed(2)}% each
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
    // AI SUMMARY
    // ========================================

    html +=
      `<div
        style="
          padding:14px;
          margin-bottom:14px;
          border-radius:10px;
          background:#111820;
          line-height:1.8;
        "
      >`;


    html +=
      `<div
        style="
          font-size:18px;
          font-weight:bold;
          margin-bottom:8px;
        "
      >
        🤖 AI Recommendation Engine
      </div>`;


    html +=
      `BUY:
      <strong>
        ${ai.buyCount}
      </strong>
      &nbsp; | &nbsp;`;


    html +=
      `WATCH:
      <strong>
        ${ai.watchCount}
      </strong>
      &nbsp; | &nbsp;`;


    html +=
      `AVOID:
      <strong>
        ${ai.avoidCount}
      </strong>`;


    html +=
      `<div
        style="
          margin-top:8px;
          font-size:12px;
          opacity:.8;
        "
      >
        Prototype AI score live market change,
        Top-20 rank aur diversification context
        par based hai.
      </div>`;


    html +=
      `</div>`;


    // ========================================
    // AI TABLE
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
          min-width:900px;
          font-size:13px;
        "
      >`;


    html +=
      `<thead>
        <tr>`;


    [
      "Rank",
      "Company",
      "Change",
      "AI Score",
      "Action",
      "Reason"

    ].forEach(
      function (header) {

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

      }
    );


    html +=
      `</tr>
      </thead>
      <tbody>`;


    ai.scored.forEach(
      function (stock) {

        const actionClass =
          stock.action ===
          "BUY"

            ? "positive"

            : stock.action ===
              "AVOID"

              ? "negative"

              : "";


        html +=
          `<tr>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ${stock.rank}
          </td>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
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


        html +=
          `<td
            class="${
              stock.change >= 0
                ? "positive"
                : "negative"
            }"
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ${
              stock.change >= 0
                ? "+"
                : ""
            }${stock.change.toFixed(2)}%
          </td>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            <strong>
              ${stock.score}/100
            </strong>
          </td>`;


        html +=
          `<td
            class="${actionClass}"
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            <strong>
              ${stock.action}
            </strong>
          </td>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ${escapeHtml(
              stock.reason
            )}
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
    // ALLOCATION TABLE
    // ========================================

    html +=
      `<div
        style="
          overflow-x:auto;
          margin-top:16px;
        "
      >`;


    html +=
      `<table
        style="
          width:100%;
          border-collapse:collapse;
          min-width:850px;
          font-size:13px;
        "
      >`;


    html +=
      `<thead>
        <tr>`;


    [
      "Rank",
      "Company",
      "Price",
      "Nifty Top-20 Target %",
      "Target ₹",
      "Shares",
      "Actual ₹",
      "Actual %",
      "Sector",
      "Group"

    ].forEach(
      function (header) {

        html +=
          `<th
            style="
              text-align:left;
              padding:9px;
              border-bottom:1px solid #39424e;
              white-space:nowrap;
            "
          >
            ${header}
          </th>`;

      }
    );


    html +=
      `</tr>
      </thead>
      <tbody>`;


    result.selected.forEach(
      function (
        stock,
        index
      ) {

        const actualClass =
          stock.quantity > 0
            ? "positive"
            : "negative";


        html +=
          `<tr>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ${index + 1}
          </td>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
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


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ₹${formatMoney(
              stock.price
            )}
          </td>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ${stock.targetPercent.toFixed(2)}%
          </td>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ₹${formatMoney(
              stock.targetAmount
            )}
          </td>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            <strong>
              ${stock.quantity}
            </strong>
          </td>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ₹${formatMoney(
              stock.investment
            )}
          </td>`;


        html +=
          `<td
            class="${actualClass}"
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ${stock.actualPercent.toFixed(2)}%
          </td>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ${escapeHtml(
              stock.sector
            )}
          </td>`;


        html +=
          `<td
            style="
              padding:8px;
              border-bottom:1px solid #252d38;
            "
          >
            ${escapeHtml(
              stock.businessGroup
            )}
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
    // EXPLANATION
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
      `• Top 20 ki har company ko equal theoretical target
      <strong>
        ${result.equalPercent.toFixed(2)}%
      </strong>
      diya gaya hai.
      <br>`;


    html +=
      `• Whole shares ki wajah se actual percentage exact
      ${result.equalPercent.toFixed(2)}% nahi ho sakta.
      <br>`;


    html +=
      `• Remaining balance ko affordable Top-20 stocks mein
      whole-share increments se use karne ki koshish ki gayi hai.
      <br>`;


    html +=
      `• Kisi individual stock ko approximately
      <strong>
        ${(MAX_STOCK_ALLOCATION * 100).toFixed(0)}%
      </strong>
      se upar nahi jaane diya gaya.
      <br>`;


    html +=
      `• Sector aur business-group concentration calculate ki gayi hai.
      <br>`;


    html +=
      `• Total investment entered budget se kabhi zyada nahi ho sakta.
      <br>`;


    html +=
      `• AI score abhi available live market data par based
      prototype scoring model hai.
      Fundamental/news/technical data ke bina ise final investment
      signal nahi maana jana chahiye.`;


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
          border-top:1px solid #39424e;
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
      `Target per company:
      ${result.equalPercent.toFixed(2)}%
      <br>`;


    html +=
      `AI BUY signals:
      ${ai.buyCount}
      <br>`;


    html +=
      `AI WATCH signals:
      ${ai.watchCount}
      <br>`;


    html +=
      `AI AVOID signals:
      ${ai.avoidCount}`;


    html +=
      `</div>`;


    // ========================================
    // DISCLAIMER
    // ========================================

    html +=
      `<div
        style="
          margin-top:12px;
          padding:12px;
          border-radius:10px;
          background:#111820;
          font-size:12px;
          line-height:1.6;
        "
      >
        <strong>
          Prototype-1
        </strong>
        AI analysis available market data par based hai.
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


  // ==========================================
  // TOTAL
  // ==========================================

  function calculateTotal(
    stocks
  ) {

    return stocks.reduce(
      function (
        sum,
        stock
      ) {

        return (
          sum +
          Number(
            stock.investment ||
            0
          )
        );

      },
      0
    );

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
  // CLAMP
  // ==========================================

  function clamp(
    value,
    min,
    max
  ) {

    return Math.min(
      max,
      Math.max(
        min,
        value
      )
    );

  }


  // ==========================================
  // HTML ESCAPE
  // ==========================================

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


  console.log(
    "Prototype-1 app.js loaded successfully."
  );

})();
