// ============================================
// PROTOTYPE-1
// APP ENGINE
// LIVE MARKET DATA + RANK-WEIGHTED TOP 20
// BUDGET ALLOCATION
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loading...");


  // ==========================================
  // RISK / DIVERSIFICATION LIMITS
  // ==========================================

  const MAX_STOCK_ALLOCATION = 0.35; // 35%
  const MAX_SECTOR_ALLOCATION = 0.40; // 40%
  const MAX_GROUP_ALLOCATION = 0.30; // 30%

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
          Number(amountInput.value);


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
      // BUILD RANK-WEIGHTED PLAN
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
          `${stock.change >= 0 ? "+" : ""}${stock.change.toFixed(2)}%`;


        const price =
          document.createElement(
            "div"
          );


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
  // RANK-WEIGHTED BUDGET PLAN
  // ==========================================

  function buildTop20BudgetPlan(
    stocks,
    budget
  ) {

    const count =
      stocks.length;


    // ----------------------------------------
    // RANK WEIGHTS
    //
    // Rank 1 = 20
    // Rank 2 = 19
    // ...
    // Rank 20 = 1
    //
    // No equal 5%.
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

          return sum +
            item.weight;

        },
        0
      );


    // ----------------------------------------
    // TARGET PERCENTAGE
    // ----------------------------------------

    const targetMap = {};


    rankWeights.forEach(
      function (item) {

        targetMap[item.symbol] =
          (
            item.weight /
            weightTotal
          ) * 100;

      }
    );


    // ----------------------------------------
    // INITIAL TARGET
    // ----------------------------------------

    const selected =
      stocks.map(
        function (stock, index) {

          const targetPercent =
            targetMap[
              stock.symbol
            ];


          const targetAmount =
            budget *
            (
              targetPercent /
              100
            );


          const quantity =
            Math.floor(
              targetAmount /
              stock.price
            );


          return {

            ...stock,

            rank:
              index + 1,

            rankWeight:
              rankWeights[index].weight,

            targetPercent,

            targetAmount,

            quantity,

            investment:
              quantity *
              stock.price

          };

        }
      );


    // ----------------------------------------
    // ALLOCATION TOTAL
    // ----------------------------------------

    let total =
      calculateTotal(
        selected
      );


    let balance =
      Math.max(
        0,
        budget - total
      );


    // ----------------------------------------
    // ADD WHOLE SHARES
    //
    // Every new share is checked against:
    //
    // 1. Budget
    // 2. Stock max
    // 3. Sector max
    // 4. Group max
    //
    // Candidate with largest target gap
    // gets priority.
    // ----------------------------------------

    let guard = 0;


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


              if (
                nextCost >
                balance
              ) {

                return false;

              }


              const nextInvestment =
                stock.investment +
                nextCost;


              // STOCK LIMIT

              if (
                nextInvestment >
                budget *
                MAX_STOCK_ALLOCATION
              ) {

                return false;

              }


              const sectorTotal =
                getSectorTotal(
                  selected,
                  stock.sector
                );


              // SECTOR LIMIT

              if (
                sectorTotal +
                nextCost >
                budget *
                MAX_SECTOR_ALLOCATION
              ) {

                return false;

              }


              const groupTotal =
                getGroupTotal(
                  selected,
                  stock.businessGroup
                );


              // GROUP LIMIT

              if (
                groupTotal +
                nextCost >
                budget *
                MAX_GROUP_ALLOCATION
              ) {

                return false;

              }


              return true;

            }
          )
          .sort(
            function (a, b) {

              // Primary:
              // target percentage gap

              const aGap =
                a.targetAmount -
                a.investment;


              const bGap =
                b.targetAmount -
                b.investment;


              if (
                bGap !== aGap
              ) {

                return bGap -
                  aGap;

              }


              // Secondary:
              // higher rank first

              if (
                a.rank !== b.rank
              ) {

                return a.rank -
                  b.rank;

              }


              // Final:
              // stronger live performance

              return b.change -
                a.change;

            }
          );


      if (
        !candidates.length
      ) {

        break;

      }


      const chosen =
        candidates[0];


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
    // CONCENTRATION TOTALS
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


    // ----------------------------------------
    // ACTUAL PERCENTAGES
    // ----------------------------------------

    selected.forEach(
      function (stock) {

        stock.actualPercent =
          total > 0
            ? (
                stock.investment /
                total
              ) * 100
            : 0;


        stock.sectorPercent =
          total > 0
            ? (
                (
                  sectorTotals[
                    stock.sector ||
                    "Nifty 50"
                  ] || 0
                ) /
                total
              ) * 100
            : 0;


        stock.groupPercent =
          total > 0
            ? (
                (
                  groupTotals[
                    stock.businessGroup ||
                    stock.symbol
                  ] || 0
                ) /
                total
              ) * 100
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

      rankWeights,

      weightTotal,

      sectorTotals,

      groupTotals

    };

  }


  // ==========================================
  // SECTOR TOTAL
  // ==========================================

  function getSectorTotal(
    stocks,
    sector
  ) {

    return stocks.reduce(
      function (sum, stock) {

        if (
          (
            stock.sector ||
            "Nifty 50"
          ) ===
          (
            sector ||
            "Nifty 50"
          )
        ) {

          return sum +
            Number(
              stock.investment || 0
            );

        }


        return sum;

      },
      0
    );

  }


  // ==========================================
  // GROUP TOTAL
  // ==========================================

  function getGroupTotal(
    stocks,
    group
  ) {

    return stocks.reduce(
      function (sum, stock) {

        if (
          (
            stock.businessGroup ||
            stock.symbol
          ) ===
          (
            group ||
            stock.symbol
          )
        ) {

          return sum +
            Number(
              stock.investment || 0
            );

        }


        return sum;

      },
      0
    );

  }


  // ==========================================
  // TOTAL
  // ==========================================

  function calculateTotal(
    stocks
  ) {

    return stocks.reduce(
      function (sum, stock) {

        return sum +
          Number(
            stock.investment || 0
          );

      },
      0
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
      `<div class="investment-summary"
        style="
          padding:14px;
          margin-bottom:14px;
          border-radius:10px;
          background:#111820;
        ">`;


    html +=
      `<div class="investment-title">
        Top 20 Rank-Weighted Diversification Plan
      </div>`;


    html +=
      `<div style="
        line-height:1.8;
        margin-top:8px;
      ">`;


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
        #1 = ${result.rankWeights[0].weight}
        → #${result.top20Count} = 1
      </strong>
      <br>`;


    html +=
      `Actual whole-share investment:
      <strong>
        ₹${formatMoney(result.totalInvestment)}
      </strong>
      <br>`;


    html +=
      `Remaining balance:
      <strong>
        ₹${formatMoney(result.balance)}
      </strong>`;


    html +=
      `</div>`;


    html +=
      `</div>`;


    // ========================================
    // TABLE
    // ========================================

    html +=
      `<div style="
        overflow-x:auto;
        margin-top:12px;
      ">`;


    html +=
      `<table style="
        width:100%;
        border-collapse:collapse;
        min-width:1000px;
        font-size:13px;
      ">`;


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

      "Group"

    ];


    headers.forEach(
      function (header) {

        html +=
          `<th style="
            text-align:left;
            padding:9px;
            border-bottom:1px solid #39424e;
            white-space:nowrap;
          ">
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


        html +=
          `<td style="
            padding:8px;
            border-bottom:1px solid #252d38;
          ">
            ${stock.rank}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:1px solid #252d38;
          ">
            <strong>
              ${escapeHtml(stock.name)}
            </strong>
            <br>
            <small>
              ${escapeHtml(stock.symbol)}
            </small>
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:1px solid #252d38;
          ">
            ₹${formatMoney(stock.price)}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:1px solid #252d38;
          ">
            ${stock.rankWeight}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:1px solid #252d38;
          ">
            ${stock.targetPercent.toFixed(2)}%
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:1px solid #252d38;
          ">
            ₹${formatMoney(stock.targetAmount)}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:1px solid #252d38;
          ">
            <strong>
              ${stock.quantity}
            </strong>
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:1px solid #252d38;
          ">
            ₹${formatMoney(stock.investment)}
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
          `<td style="
            padding:8px;
            border-bottom:1px solid #252d38;
          ">
            ${escapeHtml(stock.sector)}
          </td>`;


        html +=
          `<td style="
            padding:8px;
            border-bottom:1px solid #252d38;
          ">
            ${escapeHtml(stock.businessGroup)}
          </td>`;


        html +=
          `</tr>`;

      }
    );


    html +=
      `</tbody>`;


    html +=
      `</table>`;


    html +=
      `</div>`;


    // ========================================
    // ALLOCATION LOGIC
    // ========================================

    html +=
      `<div style="
        margin-top:16px;
        padding:14px;
        border-radius:10px;
        background:#111820;
        line-height:1.7;
      ">`;


    html +=
      `<strong>
        Allocation logic
      </strong>
      <br>`;


    html +=
      `• Equal 5% allocation use nahi ki gayi.
      <br>`;


    html +=
      `• Current Top 20 ko live ranking ke basis par
      weight diya gaya hai.
      <br>`;


    html +=
      `• Rank #1 ko highest weight aur lower ranks ko
      progressively lower weight milta hai.
      <br>`;


    html +=
      `• Target percentage automatically rank weight se
      calculate hota hai.
      <br>`;


    html +=
      `• Whole shares ki wajah se actual allocation
      target percentage se thoda different ho sakta hai.
      <br>`;


    html +=
      `• Remaining balance ko affordable stocks mein
      whole-share increments se use karne ki koshish hoti hai.
      <br>`;


    html +=
      `• Kisi individual stock ko
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
      `• Total investment budget se kabhi zyada nahi hoga.
      <br>`;


    html +=
      `• Ye live market data aur prototype allocation rules
      par based calculation hai; investment decision final nahi hai.`;


    html +=
      `</div>`;


    // ========================================
    // FINAL SUMMARY
    // ========================================

    html +=
      `<div style="
        margin-top:14px;
        padding:14px;
        border-top:1px solid #39424e;
        line-height:1.8;
      ">`;


    html +=
      `<strong>
        Final Summary
      </strong>
      <br>`;


    html +=
      `Budget:
      ₹${formatMoney(budget)}
      <br>`;


    html +=
      `Invested:
      ₹${formatMoney(result.totalInvestment)}
      <br>`;


    html +=
      `Balance:
      ₹${formatMoney(result.balance)}
      <br>`;


    html +=
      `Top-20 companies considered:
      ${result.top20Count}
      <br>`;


    html +=
      `Allocation:
      Rank-Weighted
      <br>`;


    html +=
      `Stock limit:
      ${(MAX_STOCK_ALLOCATION * 100).toFixed(0)}%
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


    return html;

  }


  // ==========================================
  // MARKET STATUS
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
  // MONEY FORMAT
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
    "Prototype-1 app.js loaded successfully."
  );

})();
