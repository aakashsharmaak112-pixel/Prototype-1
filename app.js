// ============================================
// PROTOTYPE-1
// APP CONTROLLER
// LIVE MARKET DATA + RANKING ENGINE
// ============================================


// ============================================
// NIFTY 50 SYMBOLS
// ============================================

const NIFTY_50_SYMBOLS = [
  "ADANIENT",
  "ADANIPORTS",
  "APOLLOHOSP",
  "ASIANPAINT",
  "AXISBANK",
  "BAJAJ-AUTO",
  "BAJFINANCE",
  "BAJAJFINSV",
  "BEL",
  "BHARTIARTL",
  "CIPLA",
  "COALINDIA",
  "DRREDDY",
  "EICHERMOT",
  "ETERNAL",
  "GRASIM",
  "HCLTECH",
  "HDFCBANK",
  "HDFCLIFE",
  "HEROMOTOCO",
  "HINDALCO",
  "HINDUNILVR",
  "ICICIBANK",
  "INDUSINDBK",
  "INFY",
  "ITC",
  "JIOFIN",
  "JSWSTEEL",
  "KOTAKBANK",
  "LT",
  "M&M",
  "MARUTI",
  "NESTLEIND",
  "NTPC",
  "ONGC",
  "POWERGRID",
  "RELIANCE",
  "SBILIFE",
  "SBIN",
  "SHRIRAMFIN",
  "SUNPHARMA",
  "TATACONSUM",
  "TATAMOTORS",
  "TATASTEEL",
  "TCS",
  "TECHM",
  "TITAN",
  "TRENT",
  "ULTRACEMCO",
  "WIPRO"
];


// ============================================
// DISPLAY NAMES
// ============================================

const STOCK_NAMES = {

  ADANIENT: "Adani Enterprises",
  ADANIPORTS: "Adani Ports",
  APOLLOHOSP: "Apollo Hospitals",
  ASIANPAINT: "Asian Paints",
  AXISBANK: "Axis Bank",
  "BAJAJ-AUTO": "Bajaj Auto",
  BAJFINANCE: "Bajaj Finance",
  BAJAJFINSV: "Bajaj Finserv",
  BEL: "Bharat Electronics",
  BHARTIARTL: "Bharti Airtel",
  CIPLA: "Cipla",
  COALINDIA: "Coal India",
  DRREDDY: "Dr. Reddy's Laboratories",
  EICHERMOT: "Eicher Motors",
  ETERNAL: "Eternal",
  GRASIM: "Grasim Industries",
  HCLTECH: "HCL Technologies",
  HDFCBANK: "HDFC Bank",
  HDFCLIFE: "HDFC Life",
  HEROMOTOCO: "Hero MotoCorp",
  HINDALCO: "Hindalco Industries",
  HINDUNILVR: "Hindustan Unilever",
  ICICIBANK: "ICICI Bank",
  INDUSINDBK: "IndusInd Bank",
  INFY: "Infosys",
  ITC: "ITC",
  JIOFIN: "Jio Financial Services",
  JSWSTEEL: "JSW Steel",
  KOTAKBANK: "Kotak Mahindra Bank",
  LT: "Larsen & Toubro",
  "M&M": "Mahindra & Mahindra",
  MARUTI: "Maruti Suzuki",
  NESTLEIND: "Nestle India",
  NTPC: "NTPC",
  ONGC: "ONGC",
  POWERGRID: "Power Grid Corporation",
  RELIANCE: "Reliance Industries",
  SBILIFE: "SBI Life Insurance",
  SBIN: "State Bank of India",
  SHRIRAMFIN: "Shriram Finance",
  SUNPHARMA: "Sun Pharmaceutical",
  TATACONSUM: "Tata Consumer Products",
  TATAMOTORS: "Tata Motors",
  TATASTEEL: "Tata Steel",
  TCS: "Tata Consultancy Services",
  TECHM: "Tech Mahindra",
  TITAN: "Titan Company",
  TRENT: "Trent",
  ULTRACEMCO: "UltraTech Cement",
  WIPRO: "Wipro"

};


// ============================================
// ELEMENTS
// ============================================

let connectButton;
let analyzeButton;
let totpInput;
let amountInput;
let status;
let list;
let recommendation;
let stockCount;
let errorBox;


// ============================================
// INITIALIZE
// ============================================

document.addEventListener(
  "DOMContentLoaded",
  function () {

    console.log(
      "Prototype-1 app.js starting..."
    );


    connectButton =
      document.getElementById(
        "connectButton"
      );

    analyzeButton =
      document.getElementById(
        "analyzeButton"
      );

    totpInput =
      document.getElementById(
        "totp"
      );

    amountInput =
      document.getElementById(
        "amount"
      );

    status =
      document.getElementById(
        "marketStatus"
      );

    list =
      document.getElementById(
        "top20List"
      );

    recommendation =
      document.getElementById(
        "recommendation"
      );

    stockCount =
      document.getElementById(
        "stockCount"
      );

    errorBox =
      document.getElementById(
        "errorBox"
      );


    if (stockCount) {

      stockCount.innerText =
        NIFTY_50_SYMBOLS.length;

    }


    setupAnalyzeButton();

    setupConnectButton();


    console.log(
      "Prototype-1 event listeners ready."
    );

  }
);


// ============================================
// ERROR
// ============================================

function clearError() {

  if (!errorBox) {
    return;
  }

  errorBox.style.display =
    "none";

  errorBox.innerText =
    "";

}


function showError(message) {

  if (!errorBox) {
    return;
  }

  errorBox.innerText =
    message ||
    "Unknown error.";

  errorBox.style.display =
    "block";

}


// ============================================
// NORMALIZE SYMBOL
// ============================================

function normalizeSymbol(symbol) {

  return String(
    symbol || ""
  )
    .trim()
    .replace(
      /-EQ$/i,
      ""
    )
    .toUpperCase();

}


// ============================================
// CONVERT MARKET DATA
// ============================================

function getMatchedStocks() {

  if (
    !window.MARKET_DATA ||
    !window.MARKET_DATA.stocks
  ) {

    console.error(
      "MARKET_DATA.stocks not available."
    );

    return [];

  }


  const liveData =
    window.MARKET_DATA.stocks;


  const liveMap = {};


  Object.keys(liveData).forEach(
    function (key) {

      const raw =
        liveData[key];

      if (!raw) {
        return;
      }


      const symbol =
        normalizeSymbol(
          raw.symbol ||
          raw.displaySymbol ||
          key
        );


      if (!symbol) {
        return;
      }


      const price =
        Number(
          raw.price ??
          raw.ltp
        );


      const change =
        Number(
          raw.change ??
          raw.perChange
        );


      if (
        !Number.isFinite(price) ||
        price <= 0
      ) {

        return;

      }


      liveMap[symbol] = {

        symbol:
          symbol,

        name:
          STOCK_NAMES[symbol] ||
          symbol,

        price:
          price,

        ltp:
          price,

        change:
          Number.isFinite(change)
            ? change
            : 0,

        perChange:
          Number.isFinite(change)
            ? change
            : 0

      };

    }
  );


  const matched = [];


  NIFTY_50_SYMBOLS.forEach(
    function (symbol) {

      const normalized =
        normalizeSymbol(
          symbol
        );


      const stock =
        liveMap[
          normalized
        ];


      if (!stock) {

        console.warn(
          "Nifty symbol not matched:",
          normalized
        );

        return;

      }


      matched.push(
        stock
      );

    }
  );


  console.log(
    "Nifty 50 matched:",
    matched.length
  );


  return matched;

}


// ============================================
// BUILD TOP 20 USING RANKING ENGINE
// ============================================

function buildTop20Directly() {

  const matchedStocks =
    getMatchedStocks();


  if (!matchedStocks.length) {

    return [];

  }


  // ------------------------------------------
  // IMPORTANT:
  // USE RANKING ENGINE
  // ------------------------------------------

  if (
    !window.RANKING_ENGINE ||
    typeof window.RANKING_ENGINE.getTop20 !==
      "function"
  ) {

    console.error(
      "RANKING_ENGINE.getTop20() not available."
    );

    return [];

  }


  const top20 =
    window.RANKING_ENGINE.getTop20(
      matchedStocks
    );


  console.log(
    "Ranking Engine Top 20:",
    top20
  );


  return top20;

}


// ============================================
// DISPLAY TOP 20
// ============================================

function loadTop20() {

  const top20 =
    buildTop20Directly();


  if (
    !top20.length
  ) {

    if (status) {

      status.innerText =
        "NO DATA";

      status.className =
        "status-error";

    }


    if (list) {

      list.innerHTML =
        `
        <p class="note">
          Live market data received,
          but Ranking Engine could not
          calculate Top 20.
        </p>
        `;

    }

    return;

  }


  if (status) {

    status.innerText =
      "LIVE • " +
      (
        window.MARKET_DATA.totalStocks ||
        50
      ) +
      "/50";

    status.className =
      "status-ready";

  }


  if (!list) {
    return;
  }


  list.innerHTML =
    "";


  top20.forEach(
    function (stock, index) {

      const change =
        Number(
          stock.change ??
          stock.perChange ??
          0
        );


      const price =
        Number(
          stock.price ??
          stock.ltp ??
          0
        );


      const changeClass =
        change >= 0
          ? "positive"
          : "negative";


      const changeText =
        (
          change >= 0
            ? "+"
            : ""
        ) +
        change.toFixed(2) +
        "%";


      const row =
        document.createElement(
          "div"
        );


      row.className =
        "stock";


      row.innerHTML =
        `

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
            </div>

          </div>

        </div>


        <div class="stock-change">

          <div class="${changeClass}">
            ${changeText}
          </div>

          <div class="stock-sector">
            ₹${price.toLocaleString(
              "en-IN",
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              }
            )}
          </div>

        </div>

        `;


      list.appendChild(
        row
      );

    }
  );


  // ------------------------------------------
  // SAVE TOP 20 GLOBALLY
  // ------------------------------------------

  window.TOP_20_STOCKS =
    top20;


  console.log(
    "TOP_20_STOCKS saved:",
    window.TOP_20_STOCKS
  );

}


// ============================================
// CONNECT LIVE MARKET DATA
// ============================================

function setupConnectButton() {

  if (!connectButton) {
    return;
  }


  connectButton.addEventListener(
    "click",
    async function () {

      clearError();


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

          list.innerHTML =
            `
            <p class="note">
              Current 6-digit TOTP enter karein.
            </p>
            `;

        }


        totpInput?.focus();

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


        showError(
          "market-data.js load nahi hua."
        );

        return;

      }


      connectButton.disabled =
        true;

      connectButton.innerText =
        "Connecting...";


      if (status) {

        status.innerText =
          "LOADING";

        status.className =
          "status-pending";

      }


      if (list) {

        list.innerHTML =
          `
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


        if (!result) {

          throw new Error(
            "Market data request failed."
          );

        }


        loadTop20();

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

          list.innerHTML =
            `
            <p class="note">
              Kotak Neo live quotes request failed.
            </p>
            `;

        }


        showError(
          error?.message ||
          "Unexpected connection error."
        );

      }

      finally {

        connectButton.disabled =
          false;

        connectButton.innerText =
          "Connect Live Market Data";

      }

    }
  );

}


// ============================================
// ANALYZE INVESTMENT
// ============================================

function setupAnalyzeButton() {

  if (!analyzeButton) {
    return;
  }


  analyzeButton.addEventListener(
    "click",
    function () {

      clearError();


      const amount =
        Number(
          amountInput?.value
        );


      if (
        !amount ||
        amount <= 0
      ) {

        if (recommendation) {

          recommendation.innerText =
            "Please valid investment amount enter karein.";

        }

        return;

      }


      if (
        typeof window.analyzeInvestmentAmount ===
        "function"
      ) {

        try {

          const result =
            window.analyzeInvestmentAmount(
              amount
            );


          if (
            result &&
            result.success &&
            recommendation
          ) {

            recommendation.innerText =
              result.message;

            return;

          }

        }

        catch (error) {

          console.error(
            "Investment analysis error:",
            error
          );

        }

      }


      if (!recommendation) {
        return;
      }


      recommendation.innerText =
        "₹" +
        amount.toLocaleString(
          "en-IN"
        ) +
        " ke liye available live market data ke basis par diversification aur risk management ko priority di jayegi.";

    }
  );

}


// ============================================
// HTML ESCAPE
// ============================================

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


// ============================================
// GLOBAL ACCESS
// ============================================

window.buildTop20Directly =
  buildTop20Directly;

window.loadTop20 =
  loadTop20;

window.NIFTY_50_SYMBOLS =
  NIFTY_50_SYMBOLS;


console.log(
  "Prototype-1 app.js READY — Ranking Engine Connected"
);
