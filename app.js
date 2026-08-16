// ============================================
// PROTOTYPE-1
// APP.JS
// REAL KOTAK NEO MARKET DATA
// ============================================

(function () {

  "use strict";

  console.log("Prototype-1 app.js loaded.");


  // ============================================
  // HELPERS
  // ============================================

  function getNumber(value) {

    const number = Number(value);

    return Number.isFinite(number)
      ? number
      : 0;

  }


  function escapeHtml(value) {

    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

  }


  function formatPrice(value) {

    return getNumber(value).toLocaleString(
      "en-IN",
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }
    );

  }


  // ============================================
  // NORMALIZE KOTAK MARKET DATA
  // ============================================

  function normalizeMarketData(rawData) {

    const result = {};

    if (!Array.isArray(rawData)) {
      return result;
    }


    rawData.forEach(function (item) {

      if (!item) {
        return;
      }


      const symbol = String(
        item.symbol ||
        item.tradingsymbol ||
        item.displaySymbol ||
        ""
      )
        .replace(/-EQ$/i, "")
        .trim()
        .toUpperCase();


      if (!symbol) {
        return;
      }


      const price = getNumber(
        item.ltp ??
        item.price ??
        item.lastPrice
      );


      const change = getNumber(
        item.change
      );


      const perChange = getNumber(
        item.perChange ??
        item.percentChange ??
        item.pChange
      );


      result[symbol] = {

        symbol: symbol,

        price: price,

        ltp: price,

        change: change,

        perChange: perChange,

        displaySymbol:
          item.displaySymbol || symbol,

        name:
          item.name || symbol,

        sector:
          item.sector || "Nifty 50"

      };

    });


    return result;

  }


  // ============================================
  // GET LIVE MARKET DATA
  // ============================================

  function getLiveMarketData() {

    // Format 1:
    // MARKET_DATA.stocks

    if (
      window.MARKET_DATA &&
      Array.isArray(
        window.MARKET_DATA.stocks
      )
    ) {

      return normalizeMarketData(
        window.MARKET_DATA.stocks
      );

    }


    // Format 2:
    // MARKET_DATA directly as array

    if (
      Array.isArray(
        window.MARKET_DATA
      )
    ) {

      return normalizeMarketData(
        window.MARKET_DATA
      );

    }


    // Format 3:
    // REAL_MARKET_DATA

    if (
      Array.isArray(
        window.REAL_MARKET_DATA
      )
    ) {

      return normalizeMarketData(
        window.REAL_MARKET_DATA
      );

    }


    return {};

  }


  // ============================================
  // BUILD TOP 20
  //
  // IMPORTANT:
  // Ranking uses perChange
  // NOT rupee change
  // ============================================

  function buildTop20() {

    if (
      !Array.isArray(
        window.NIFTY_50_STOCKS
      )
    ) {

      console.error(
        "NIFTY_50_STOCKS not available."
      );

      return [];

    }


    const liveData =
      getLiveMarketData();


    const rankings = [];


    window.NIFTY_50_STOCKS.forEach(
      function (stock) {

        if (!stock) {
          return;
        }


        const symbol = String(
          stock.symbol || ""
        )
          .replace(/-EQ$/i, "")
          .trim()
          .toUpperCase();


        if (!symbol) {
          return;
        }


        const data =
          liveData[symbol];


        // No live data = don't include

        if (!data) {
          return;
        }


        const price =
          getNumber(
            data.price
          );


        if (price <= 0) {
          return;
        }


        /*
          Kotak Neo:

          change = rupee change

          perChange = percentage change

          Example:

          Apollo Hospitals

          change = 320.5

          perChange = 3.7267

          Display must be:

          +3.73%

          NOT:

          +320.50%
        */

        const percentageChange =
          getNumber(
            data.perChange
          );


        rankings.push({

          symbol: symbol,

          name:
            stock.name ||
            data.name ||
            symbol,

          sector:
            stock.sector ||
            data.sector ||
            "Nifty 50",

          price: price,

          change:
            getNumber(
              data.change
            ),

          perChange:
            percentageChange,

          score:
            percentageChange

        });

      }
    );


    // Highest percentage gain first

    rankings.sort(
      function (a, b) {

        return (
          b.perChange -
          a.perChange
        );

      }
    );


    const top20 =
      rankings.slice(
        0,
        20
      );


    // Save globally

    window.TOP_20_STOCKS =
      top20;


    return top20;

  }


  // ============================================
  // DISPLAY TOP 20
  // ============================================

  function displayTop20() {

    const list =
      document.getElementById(
        "top20List"
      );


    const status =
      document.getElementById(
        "marketStatus"
      );


    if (!list) {
      return;
    }


    const top20 =
      buildTop20();


    if (!top20.length) {

      if (status) {

        status.innerText =
          "NO DATA";

        status.className =
          "status-error";

      }


      list.innerHTML = `

        <p class="note">

          Live market data available hai,
          lekin valid Nifty 50 prices
          match nahi hue.

        </p>

      `;

      return;

    }


    if (status) {

      status.innerText =
        "LIVE • 50/50";

      status.className =
        "status-ready";

    }


    list.innerHTML =
      "";


    top20.forEach(
      function (stock, index) {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "stock";


        const percentage =
          getNumber(
            stock.perChange
          );


        const changeClass =
          percentage >= 0
            ? "positive"
            : "negative";


        const percentageText =
          (
            percentage >= 0
              ? "+"
              : ""
          ) +
          percentage.toFixed(2) +
          "%";


        row.innerHTML = `

          <div class="stock-left">

            <div class="rank">
              ${index + 1}
            </div>


            <div>

              <div class="stock-name">

                ${escapeHtml(
                  stock.name
                )}

              </div>


              <div class="stock-sector">

                ${escapeHtml(
                  stock.symbol
                )}

                • Nifty 50

              </div>

            </div>

          </div>


          <div class="stock-change">

            <div class="${changeClass}">

              ${percentageText}

            </div>


            <div class="stock-sector">

              ₹${formatPrice(
                stock.price
              )}

            </div>

          </div>

        `;


        list.appendChild(
          row
        );

      }
    );


    console.log(
      "Prototype-1 TOP 20:",
      top20
    );

  }


  // ============================================
  // INVESTMENT ANALYSIS
  // BUDGET SAFE VERSION
  // ============================================

  function analyzeInvestment() {

    const amountInput =
      document.getElementById(
        "amount"
      );


    const recommendation =
      document.getElementById(
        "recommendation"
      );


    if (
      !amountInput ||
      !recommendation
    ) {

      return;

    }


    const amount =
      getNumber(
        amountInput.value
      );


    if (
      amount <= 0
    ) {

      recommendation.innerText =
        "Please valid investment amount enter karein.";

      return;

    }


    // Get current live ranking

    const top20 =
      buildTop20();


    if (!top20.length) {

      recommendation.innerText =
        "Pehle Connect Live Market Data karke live quotes load karein.";

      return;

    }


    // ==========================================
    // BUDGET SAFE ALLOCATION
    // ==========================================

    let remaining =
      amount;


    const selected = [];


    /*
      Maximum 3 stocks.

      IMPORTANT:

      Total investment will NEVER
      exceed entered amount.
    */

    for (
      let i = 0;
      i < top20.length;
      i++
    ) {

      if (
        remaining <= 0
      ) {

        break;

      }


      if (
        selected.length >= 3
      ) {

        break;

      }


      const stock =
        top20[i];


      const price =
        getNumber(
          stock.price
        );


      if (
        price <= 0
      ) {

        continue;

      }


      // Stock must be affordable

      if (
        price > remaining
      ) {

        continue;

      }


      /*
        Remaining slots.

        Example:

        ₹10,000

        First stock:
        remaining = ₹10,000

        3 slots

        Allocate based on remaining/slots.
      */

      const slotsLeft =
        3 -
        selected.length;


      let quantity =
        Math.floor(
          remaining /
          slotsLeft /
          price
        );


      /*
        If calculated quantity is zero,
        try one share.
      */

      if (
        quantity < 1
      ) {

        quantity = 1;

      }


      /*
        HARD budget limit.
      */

      quantity =
        Math.min(
          quantity,
          Math.floor(
            remaining /
            price
          )
        );


      if (
        quantity <= 0
      ) {

        continue;

      }


      let investment =
        quantity *
        price;


      /*
        Final safety check.
      */

      if (
        investment >
        remaining
      ) {

        quantity =
          Math.floor(
            remaining /
            price
          );


        investment =
          quantity *
          price;

      }


      if (
        quantity <= 0 ||
        investment <= 0 ||
        investment > remaining
      ) {

        continue;

      }


      selected.push({

        symbol:
          stock.symbol,

        name:
          stock.name,

        sector:
          stock.sector,

        price:
          price,

        perChange:
          getNumber(
            stock.perChange
          ),

        quantity:
          quantity,

        investment:
          investment

      });


      remaining -=
        investment;


      /*
        Floating point protection.
      */

      if (
        remaining < 0
      ) {

        remaining = 0;

      }

    }


    // ==========================================
    // NO AFFORDABLE STOCK
    // ==========================================

    if (
      !selected.length
    ) {

      recommendation.innerText =
        "Current Top 20 mein koi stock entered investment amount ke andar affordable nahi hai.";

      return;

    }


    // ==========================================
    // FINAL TOTAL
    // ==========================================

    const totalInvestment =
      selected.reduce(
        function (
          total,
          stock
        ) {

          return (
            total +
            stock.investment
          );

        },
        0
      );


    /*
      Final safety clamp.

      This guarantees:

      totalInvestment <= amount
    */

    const safeTotal =
      Math.min(
        amount,
        totalInvestment
      );


    const balance =
      Math.max(
        0,
        amount -
        safeTotal
      );


    // ==========================================
    // BUILD RECOMMENDATION
    // ==========================================

    let html = `

      <strong>
        Investment Plan
      </strong>

      <br><br>

      Amount:
      ₹${formatPrice(
        amount
      )}

      <br>

      Selected Stocks:
      ${selected.length}

      <br>

      Estimated Investment:
      ₹${formatPrice(
        safeTotal
      )}

      <br>

      Balance:
      ₹${formatPrice(
        balance
      )}

      <br><br>

    `;


    // ==========================================
    // STOCK DETAILS
    // ==========================================

    selected.forEach(
      function (
        stock,
        index
      ) {

        const percentage =
          getNumber(
            stock.perChange
          );


        const changeClass =
          percentage >= 0
            ? "positive"
            : "negative";


        const percentageText =
          (
            percentage >= 0
              ? "+"
              : ""
          ) +
          percentage.toFixed(2) +
          "%";


        html += `

          <div
            style="
              padding:12px 0;
              border-bottom:1px solid #252d38;
            "
          >

            <strong>

              ${index + 1}.
              ${escapeHtml(
                stock.symbol
              )}

            </strong>


            <br>


            ${stock.quantity}
            share${stock.quantity > 1 ? "s" : ""}


            <br>


            <span
              class="${changeClass}"
            >

              ${percentageText}

            </span>


            <br>


            Price:

            ₹${formatPrice(
              stock.price
            )}


            &nbsp; • &nbsp;


            Invest:

            ₹${formatPrice(
              stock.investment
            )}

          </div>

        `;

      }
    );


    // ==========================================
    // FINAL MESSAGE
    // ==========================================

    html += `

      <br>

      ₹${formatPrice(
        amount
      )}

      ke liye current live ranking ke basis par

      ${selected.length}

      stock(s) mein allocation calculate
      ki gayi hai.


      Total estimated investment

      ₹${formatPrice(
        safeTotal
      )}.


      ₹${formatPrice(
        balance
      )}

      balance bacha hai.


      <br><br>


      Ye calculation live market data aur
      prototype ranking par based hai.
      Investment ka final decision aapka hai.

    `;


    recommendation.innerHTML =
      html;


    console.log(
      "Investment Plan:",
      {
        amount: amount,
        selected: selected,
        totalInvestment: safeTotal,
        balance: balance
      }
    );

  }


  // ============================================
  // CONNECT LIVE MARKET DATA
  // ============================================

  async function connectLiveMarketData() {

    const button =
      document.getElementById(
        "connectButton"
      );


    const totpInput =
      document.getElementById(
        "totp"
      );


    const status =
      document.getElementById(
        "marketStatus"
      );


    const list =
      document.getElementById(
        "top20List"
      );


    const errorBox =
      document.getElementById(
        "errorBox"
      );


    const totp =
      String(
        totpInput?.value || ""
      ).trim();


    // ==========================================
    // TOTP VALIDATION
    // ==========================================

    if (
      !/^\d{6}$/.test(
        totp
      )
    ) {

      if (status) {

        status.innerText =
          "TOTP REQUIRED";

        status.className =
          "status-pending";

      }


      if (list) {

        list.innerHTML = `

          <p class="note">

            Current 6-digit TOTP enter karein.

          </p>

        `;

      }


      if (totpInput) {

        totpInput.focus();

      }


      return;

    }


    // ==========================================
    // MARKET ENGINE CHECK
    // ==========================================

    if (
      typeof window.fetchMarketData !==
      "function"
    ) {

      if (status) {

        status.innerText =
          "ENGINE ERROR";

        status.className =
          "status-error";

      }


      if (errorBox) {

        errorBox.innerText =
          "market-data.js load nahi hua ya fetchMarketData() available nahi hai.";

        errorBox.style.display =
          "block";

      }


      return;

    }


    // ==========================================
    // LOADING
    // ==========================================

    if (button) {

      button.disabled =
        true;

      button.innerText =
        "Connecting...";

    }


    if (status) {

      status.innerText =
        "LOADING";

      status.className =
        "status-pending";

    }


    if (list) {

      list.innerHTML = `

        <p class="note">

          Kotak Neo se live market data
          load ho raha hai...

        </p>

      `;

    }


    try {

      const result =
        await window.fetchMarketData(
          totp
        );


      console.log(
        "fetchMarketData result:",
        result
      );


      const success =
        result === true ||
        (
          result &&
          result.success === true
        );


      if (!success) {

        throw new Error(

          (
            result &&
            result.error
          ) ||
          "Kotak Neo live quotes request failed."

        );

      }


      /*
        Give market-data.js a moment
        to finish updating global data.
      */

      await new Promise(
        function (resolve) {

          setTimeout(
            resolve,
            100
          );

        }
      );


      // ========================================
      // DISPLAY LIVE TOP 20
      // ========================================

      displayTop20();


    }

    catch (error) {

      console.error(
        "Market connection error:",
        error
      );


      if (status) {

        status.innerText =
          "ERROR";

        status.className =
          "status-error";

      }


      if (list) {

        list.innerHTML = `

          <p class="note">

            Kotak Neo live quotes request failed.

          </p>

        `;

      }


      if (errorBox) {

        errorBox.innerText =
          error.message ||
          "Unexpected connection error.";

        errorBox.style.display =
          "block";

      }

    }

    finally {

      if (button) {

        button.disabled =
          false;

        button.innerText =
          "Connect Live Market Data";

      }

    }

  }


  // ============================================
  // DOM READY
  // ============================================

  document.addEventListener(
    "DOMContentLoaded",
    function () {

      console.log(
        "Prototype-1 dashboard ready."
      );


      const connectButton =
        document.getElementById(
          "connectButton"
        );


      const analyzeButton =
        document.getElementById(
          "analyzeButton"
        );


      // ========================================
      // CONNECT BUTTON
      // ========================================

      if (connectButton) {

        connectButton.addEventListener(
          "click",
          connectLiveMarketData
        );

      }


      // ========================================
      // ANALYZE BUTTON
      // ========================================

      if (analyzeButton) {

        analyzeButton.addEventListener(
          "click",
          analyzeInvestment
        );

      }


      // ========================================
      // STOCK COUNT
      // ========================================

      const stockCount =
        document.getElementById(
          "stockCount"
        );


      if (
        stockCount &&
        Array.isArray(
          window.NIFTY_50_STOCKS
        )
      ) {

        stockCount.innerText =
          window.NIFTY_50_STOCKS.length;

      }


      console.log(
        "Prototype-1 event listeners ready."
      );

    }
  );


  // ============================================
  // PUBLIC FUNCTIONS
  // ============================================

  window.buildTop20 =
    buildTop20;


  window.displayTop20 =
    displayTop20;


  window.analyzeInvestment =
    analyzeInvestment;


  window.connectLiveMarketData =
    connectLiveMarketData;


})();
