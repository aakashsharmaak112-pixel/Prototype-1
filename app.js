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
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
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
  // NORMALIZE KOTAK DATA
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


      const perChange = getNumber(
        item.perChange ??
        item.percentChange ??
        item.pChange
      );


      const change = getNumber(
        item.change
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
  // FIND LIVE MARKET DATA
  // ============================================

  function getLiveMarketData() {

    /*
      Primary format:

      window.MARKET_DATA.stocks
      OR
      window.MARKET_DATA as array

      Also supports:

      window.REAL_MARKET_DATA
    */


    if (
      window.MARKET_DATA &&
      Array.isArray(window.MARKET_DATA.stocks)
    ) {

      return normalizeMarketData(
        window.MARKET_DATA.stocks
      );

    }


    if (
      Array.isArray(window.MARKET_DATA)
    ) {

      return normalizeMarketData(
        window.MARKET_DATA
      );

    }


    if (
      Array.isArray(window.REAL_MARKET_DATA)
    ) {

      return normalizeMarketData(
        window.REAL_MARKET_DATA
      );

    }


    return {};

  }


  // ============================================
  // BUILD TOP 20
  // IMPORTANT:
  // RANKING = perChange
  // NOT change
  // ============================================

  function buildTop20() {

    if (
      !Array.isArray(window.NIFTY_50_STOCKS)
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


        /*
          IMPORTANT:

          Only use stocks for which
          real live price exists.
        */

        if (!data) {
          return;
        }


        const price =
          getNumber(data.price);


        if (price <= 0) {
          return;
        }


        /*
          THIS IS THE FIX.

          Kotak gives:

          change    = ₹ change
          perChange = percentage change

          Example:

          Apollo:
          change = 320.5
          perChange = 3.7267

          We MUST display 3.73%.
        */

        const percentageChange =
          getNumber(data.perChange);


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
            getNumber(data.change),

          perChange:
            percentageChange,

          score:
            percentageChange

        });

      }
    );


    /*
      Highest percentage gain first.
    */

    rankings.sort(
      function (a, b) {

        return b.perChange -
               a.perChange;

      }
    );


    return rankings.slice(0, 20);

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
          lekin valid Nifty 50 prices match nahi hue.
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


    list.innerHTML = "";


    top20.forEach(
      function (stock, index) {

        const row =
          document.createElement(
            "div"
          );


        row.className =
          "stock";


        const percentage =
          stock.perChange;


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
                ${escapeHtml(stock.name)}
              </div>

              <div class="stock-sector">
                ${escapeHtml(stock.symbol)}
                • Nifty 50
              </div>

            </div>

          </div>


          <div class="stock-change">

            <div class="${changeClass}">
              ${percentageText}
            </div>

            <div class="stock-sector">
              ₹${formatPrice(stock.price)}
            </div>

          </div>

        `;


        list.appendChild(row);

      }
    );


    /*
      Save for investment analysis.
    */

    window.TOP_20_STOCKS =
      top20;


    console.log(
      "TOP 20:",
      top20
    );

  }


  // ============================================
  // INVESTMENT ANALYSIS
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


    /*
      Always refresh ranking from
      current live data.
    */

    const top20 =
      buildTop20();


    if (!top20.length) {

      recommendation.innerText =
        "Pehle Connect Live Market Data karke live quotes load karein.";

      return;

    }


    /*
      Prototype allocation:

      Select up to 3 affordable stocks
      from the highest-ranked live stocks.

      IMPORTANT:
      This is a prototype calculation,
      not financial advice.
    */

    const selected = [];


    for (
      let i = 0;
      i < top20.length &&
      selected.length < 3;
      i++
    ) {

      const stock =
        top20[i];


      const price =
        getNumber(stock.price);


      if (
        price > 0 &&
        price <= amount
      ) {

        const quantity =
          Math.max(
            1,
            Math.floor(
              (amount / 3) /
              price
            )
          );


        const investment =
          quantity * price;


        if (
          investment <= amount
        ) {

          selected.push({

            ...stock,

            quantity:
              quantity,

            investment:
              investment

          });

        }

      }

    }


    /*
      If normal 3-stock allocation
      doesn't work, choose first
      affordable stocks with 1 share.
    */

    if (!selected.length) {

      for (
        let i = 0;
        i < top20.length &&
        selected.length < 3;
        i++
      ) {

        const stock =
          top20[i];


        if (
          stock.price <= amount
        ) {

          selected.push({

            ...stock,

            quantity: 1,

            investment:
              stock.price

          });

        }

      }

    }


    if (!selected.length) {

      recommendation.innerText =
        "Investment amount current Top 20 ke kisi stock ke 1 share ke liye bhi sufficient nahi hai.";

      return;

    }


    const totalInvestment =
      selected.reduce(
        function (total, stock) {

          return total +
                 stock.investment;

        },
        0
      );


    const balance =
      amount -
      totalInvestment;


    let html = `

      <strong>
        Investment Plan
      </strong>

      <br><br>

      Amount:
      ₹${formatPrice(amount)}

      <br>

      Selected Stocks:
      ${selected.length}

      <br>

      Estimated Investment:
      ₹${formatPrice(totalInvestment)}

      <br>

      Balance:
      ₹${formatPrice(balance)}

      <br><br>

    `;


    selected.forEach(
      function (stock, index) {

        const percentage =
          stock.perChange;


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
              ${index + 1}. ${escapeHtml(stock.symbol)}
            </strong>

            <br>

            ${stock.quantity} share${stock.quantity > 1 ? "s" : ""}

            <br>

            <span class="${changeClass}">
              ${percentageText}
            </span>

            <br>

            Price:
            ₹${formatPrice(stock.price)}

            &nbsp; • &nbsp;

            Invest:
            ₹${formatPrice(stock.investment)}

          </div>

        `;

      }
    );


    html += `

      <br>

      ₹${formatPrice(amount)}
      ke liye current live ranking ke basis par
      ${selected.length} stock(s) mein allocation
      calculate ki gayi hai.

      Total estimated investment
      ₹${formatPrice(totalInvestment)}.

      ₹${formatPrice(balance)}
      balance bacha hai.

      <br><br>

      Ye calculation live market data aur
      prototype ranking par based hai.
      Investment ka final decision aapka hai.

    `;


    recommendation.innerHTML =
      html;

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


    if (
      !/^\d{6}$/.test(totp)
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

      return;

    }


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
          Kotak Neo se live market data load ho raha hai...
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


      /*
        fetchMarketData may return:

        true

        OR

        response object
      */

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
        Small delay ensures
        market-data.js has completed
        writing MARKET_DATA.
      */

      await new Promise(
        function (resolve) {

          setTimeout(
            resolve,
            100
          );

        }
      );


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
  // START
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


      /*
        Connect button
      */

      if (connectButton) {

        connectButton.addEventListener(
          "click",
          connectLiveMarketData
        );

      }


      /*
        Analyze button
      */

      if (analyzeButton) {

        analyzeButton.addEventListener(
          "click",
          analyzeInvestment
        );

      }


      /*
        Stock count
      */

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

  window.displayTop20 =
    displayTop20;

  window.buildTop20 =
    buildTop20;

  window.analyzeInvestment =
    analyzeInvestment;

})();
