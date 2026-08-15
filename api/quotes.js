// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES
// DIAGNOSTIC VERSION
// api/quotes.js
// ============================================

const ACCESS_TOKEN = process.env.NEO_ACCESS_TOKEN;
const MOBILE = process.env.NEO_MOBILE;
const UCC = process.env.NEO_UCC;
const MPIN = process.env.NEO_MPIN;

const LOGIN_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

const VALIDATE_URL =
  "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";

const SCRIPMASTER_URL =
  "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-12/transformed-v1/nse_cm-v1.csv";

const NIFTY_50 = [
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
  "MAXHEALTH",
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
  "TATASTEEL",
  "TCS",
  "TECHM",
  "TITAN",
  "TRENT",
  "ULTRACEMCO"
];

function send(res, status, body) {
  return res.status(status).json(body);
}

async function readResponse(response) {
  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  return {
    text,
    data
  };
}

function normalizeMobile(value) {
  const mobile = String(value || "")
    .trim()
    .replace(/[^\d+]/g, "");

  if (/^\d{10}$/.test(mobile)) {
    return "+91" + mobile;
  }

  return mobile;
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        quoted = !quoted;
      }

      continue;
    }

    if (ch === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  values.push(current.trim());

  return values;
}

function loadSymbolMap(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "SCRIPMASTER: CSV empty hai."
    );
  }

  const header = parseCsvLine(lines[0]);

  const iSymbol = header.indexOf("pSymbol");
  const iExchange = header.indexOf("pExchSeg");
  const iTrading = header.indexOf("pTrdSymbol");
  const iRef = header.indexOf("pScripRefKey");

  if (
    iSymbol < 0 ||
    iExchange < 0 ||
    iTrading < 0 ||
    iRef < 0
  ) {
    throw new Error(
      "SCRIPMASTER: Required fields missing. " +
      "Header: " +
      header.join(", ")
    );
  }

  const map = {};

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);

    const exchange =
      String(row[iExchange] || "")
        .trim()
        .toLowerCase();

    if (exchange !== "nse_cm") {
      continue;
    }

    const pSymbol =
      String(row[iSymbol] || "").trim();

    const pTrdSymbol =
      String(row[iTrading] || "").trim();

    const pScripRefKey =
      String(row[iRef] || "").trim();

    if (!pSymbol) {
      continue;
    }

    const symbol =
      pScripRefKey
        .toUpperCase()
        .replace(/-EQ$/i, "");

    const tradingSymbol =
      pTrdSymbol
        .toUpperCase()
        .replace(/-EQ$/i, "");

    for (const target of NIFTY_50) {
      const cleanTarget =
        target.toUpperCase();

      if (
        symbol === cleanTarget ||
        tradingSymbol === cleanTarget
      ) {
        map[cleanTarget] = {
          symbol: cleanTarget,
          neoSymbol: pSymbol,
          pTrdSymbol,
          pScripRefKey
        };

        break;
      }
    }
  }

  return map;
}

async function kotakLogin(totp) {
  const mobileNumber =
    normalizeMobile(MOBILE);

  if (!/^\+91\d{10}$/.test(mobileNumber)) {
    throw new Error(
      "TOTP_LOGIN: NEO_MOBILE invalid hai."
    );
  }

  const response =
    await fetch(
      LOGIN_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            String(ACCESS_TOKEN).trim(),

          "neo-fin-key":
            "neotradeapi",

          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body: JSON.stringify({
          mobileNumber,
          ucc:
            String(UCC).trim(),
          totp
        })
      }
    );

  const result =
    await readResponse(response);

  if (!result.data) {
    throw new Error(
      "TOTP_LOGIN: Kotak ne JSON nahi diya. HTTP " +
      response.status +
      ". Response: " +
      result.text.slice(0, 800)
    );
  }

  if (!response.ok) {
    throw new Error(
      "TOTP_LOGIN FAILED: HTTP " +
      response.status +
      ". " +
      JSON.stringify(result.data).slice(0, 1200)
    );
  }

  const root =
    result.data?.data ||
    result.data;

  const sid =
    root?.sid ||
    root?.Sid ||
    root?.sessionId ||
    root?.sessionID ||
    root?.viewSid;

  const auth =
    root?.token ||
    root?.Auth ||
    root?.auth ||
    root?.Token ||
    root?.viewToken;

  if (!sid || !auth) {
    throw new Error(
      "TOTP_LOGIN: Response mila lekin Sid/Auth nahi mila. " +
      "Detected fields: " +
      Object.keys(root || {}).join(", ")
    );
  }

  return {
    sid,
    auth
  };
}

async function kotakValidate(session) {
  const response =
    await fetch(
      VALIDATE_URL,
      {
        method: "POST",

        headers: {
          Authorization:
            String(ACCESS_TOKEN).trim(),

          "neo-fin-key":
            "neotradeapi",

          Sid:
            String(session.sid).trim(),

          Auth:
            String(session.auth).trim(),

          "Content-Type":
            "application/json",

          Accept:
            "application/json"
        },

        body: JSON.stringify({
          mpin:
            String(MPIN).trim()
        })
      }
    );

  const result =
    await readResponse(response);

  if (!result.data) {
    throw new Error(
      "MPIN_VALIDATE: Kotak ne JSON nahi diya. HTTP " +
      response.status +
      ". Response: " +
      result.text.slice(0, 800)
    );
  }

  if (!response.ok) {
    throw new Error(
      "MPIN_VALIDATE FAILED: HTTP " +
      response.status +
      ". " +
      JSON.stringify(result.data).slice(0, 1200)
    );
  }

  const root =
    result.data?.data ||
    result.data;

  const baseUrl =
    root?.baseUrl ||
    root?.base_url ||
    root?.BaseUrl ||
    root?.BaseURL;

  if (!baseUrl) {
    throw new Error(
      "MPIN_VALIDATE: Validation response mila lekin baseUrl nahi mila. " +
      "Detected fields: " +
      Object.keys(root || {}).join(", ")
    );
  }

  return {
    baseUrl:
      String(baseUrl)
        .replace(/\/+$/, "")
  };
}

async function getScripmaster() {
  const response =
    await fetch(
      SCRIPMASTER_URL,
      {
        method: "GET",

        headers: {
          Accept:
            "text/csv"
        },

        cache:
          "no-store"
      }
    );

  const text =
    await response.text();

  if (!response.ok) {
    throw new Error(
      "SCRIPMASTER DOWNLOAD FAILED: HTTP " +
      response.status +
      ". " +
      text.slice(0, 800)
    );
  }

  if (!text.trim()) {
    throw new Error(
      "SCRIPMASTER: Empty response."
    );
  }

  return text;
}

async function getQuotes(
  baseUrl,
  symbolMap
) {
  const resolved =
    NIFTY_50
      .map(
        symbol =>
          symbolMap[symbol]
      )
      .filter(Boolean);

  const missing =
    NIFTY_50.filter(
      symbol =>
        !symbolMap[symbol]
    );

  if (!resolved.length) {
    throw new Error(
      "QUOTES: Nifty 50 ka koi symbol resolve nahi hua."
    );
  }

  const neoSymbols =
    resolved.map(
      item =>
        item.neoSymbol
    );

  const encodedSymbols =
    encodeURIComponent(
      neoSymbols.join(",")
    );

  const quoteUrl =
    baseUrl +
    "/script-details/1.0/quotes/neosymbol/" +
    encodedSymbols +
    "/all";

  const response =
    await fetch(
      quoteUrl,
      {
        method: "GET",

        headers: {
          Authorization:
            String(ACCESS_TOKEN).trim(),

          "Content-Type":
            "application/x-www-form-urlencoded",

          Accept:
            "application/json"
        },

        cache:
          "no-store"
      }
    );

  const result =
    await readResponse(response);

  if (!result.data) {
    return {
      success: false,

      status:
        response.status,

      error:
        "QUOTES: Kotak ne non-JSON response diya.",

      rawResponse:
        result.text.slice(0, 2000),

      resolved,
      missing
    };
  }

  if (!response.ok) {
    return {
      success: false,

      status:
        response.status,

      error:
        "QUOTES FAILED: HTTP " +
        response.status,

      kotakResponse:
        result.data,

      resolved,
      missing
    };
  }

  return {
    success: true,

    status:
      response.status,

    missing,
    resolved,

    data:
      result.data
  };
}

export default async function handler(
  req,
  res
) {

  // ============================================
  // POST CHECK
  // ============================================

  if (req.method !== "POST") {
    return send(res, 405, {
      success: false,

      step:
        "METHOD",

      error:
        "Use POST method."
    });
  }

  // ============================================
  // ENVIRONMENT
  // ============================================

  if (!ACCESS_TOKEN) {
    return send(res, 500, {
      success: false,

      step:
        "ENVIRONMENT",

      error:
        "NEO_ACCESS_TOKEN missing."
    });
  }

  if (!MOBILE) {
    return send(res, 500, {
      success: false,

      step:
        "ENVIRONMENT",

      error:
        "NEO_MOBILE missing."
    });
  }

  if (!UCC) {
    return send(res, 500, {
      success: false,

      step:
        "ENVIRONMENT",

      error:
        "NEO_UCC missing."
    });
  }

  if (!MPIN) {
    return send(res, 500, {
      success: false,

      step:
        "ENVIRONMENT",

      error:
        "NEO_MPIN missing."
    });
  }

  // ============================================
  // TOTP
  // ============================================

  const totp =
    String(
      req.body?.totp || ""
    ).trim();

  if (!/^\d{6}$/.test(totp)) {
    return send(res, 400, {
      success: false,

      step:
        "TOTP_INPUT",

      error:
        "Current 6-digit TOTP required."
    });
  }

  // ============================================
  // EXACT STEP TRACKING
  // ============================================

  let currentStep =
    "START";

  try {

    // ==========================================
    // 1. TOTP LOGIN
    // ==========================================

    currentStep =
      "TOTP_LOGIN";

    const login =
      await kotakLogin(totp);

    // ==========================================
    // 2. MPIN VALIDATION
    // ==========================================

    currentStep =
      "MPIN_VALIDATE";

    const session =
      await kotakValidate(login);

    // ==========================================
    // 3. SCRIPMASTER
    // ==========================================

    currentStep =
      "SCRIPMASTER";

    const csv =
      await getScripmaster();

    // ==========================================
    // 4. SYMBOL MAPPING
    // ==========================================

    currentStep =
      "SYMBOL_MAPPING";

    const symbolMap =
      loadSymbolMap(csv);

    const resolvedSymbols =
      Object.keys(symbolMap);

    const missingSymbols =
      NIFTY_50.filter(
        symbol =>
          !symbolMap[symbol]
      );

    if (!resolvedSymbols.length) {
      return send(res, 502, {
        success: false,

        source:
          "KOTAK NEO",

        step:
          currentStep,

        error:
          "Scripmaster se Nifty 50 symbols resolve nahi hue.",

        resolvedCount:
          0,

        missingSymbols
      });
    }

    // ==========================================
    // 5. QUOTES
    // ==========================================

    currentStep =
      "QUOTES";

    const quotes =
      await getQuotes(
        session.baseUrl,
        symbolMap
      );

    if (!quotes.success) {

      return send(res, 502, {

        success: false,

        source:
          "KOTAK NEO",

        step:
          currentStep,

        status:
          quotes.status,

        error:
          quotes.error,

        resolvedCount:
          quotes.resolved?.length || 0,

        missingSymbols:
          quotes.missing || [],

        kotakResponse:
          quotes.kotakResponse || null,

        rawResponse:
          quotes.rawResponse || null

      });
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    return send(res, 200, {

      success:
        true,

      source:
        "KOTAK NEO",

      step:
        "SUCCESS",

      marketData:
        "LIVE",

      totalRequested:
        NIFTY_50.length,

      totalResolved:
        quotes.resolved.length,

      totalReceived:
        Array.isArray(
          quotes.data
        )
          ? quotes.data.length
          : null,

      missingSymbols:
        quotes.missing,

      quotes:
        quotes.data

    });

  } catch (error) {

    console.error(
      "Prototype-1 Quotes Error:",
      currentStep,
      error
    );

    // ==========================================
    // IMPORTANT:
    // EXACT ERROR WILL BE RETURNED TO FRONTEND
    // ==========================================

    return send(res, 502, {

      success:
        false,

      source:
        "KOTAK NEO",

      step:
        currentStep,

      error:
        error?.message ||
        String(error),

      errorName:
        error?.name ||
        null

    });
  }
}
