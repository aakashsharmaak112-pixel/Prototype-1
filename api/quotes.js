// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES
// SERVER-SIDE AUTHENTICATION FLOW
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

async function readJson(response) {
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
    throw new Error("Scripmaster CSV is empty.");
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
      "Required Scripmaster fields missing. " +
      "Required: pSymbol, pExchSeg, pTrdSymbol, pScripRefKey"
    );
  }

  const map = {};

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);

    const exchange = String(row[iExchange] || "")
      .trim()
      .toLowerCase();

    if (exchange !== "nse_cm") {
      continue;
    }

    const pSymbol = String(row[iSymbol] || "").trim();

    const pTrdSymbol = String(row[iTrading] || "").trim();

    const pScripRefKey = String(row[iRef] || "").trim();

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
      const cleanTarget = target.toUpperCase();

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
  const mobileNumber = normalizeMobile(MOBILE);

  if (!/^\+91\d{10}$/.test(mobileNumber)) {
    throw new Error("Invalid NEO_MOBILE.");
  }

  const response = await fetch(
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
        ucc: String(UCC).trim(),
        totp
      })
    }
  );

  const result = await readJson(response);

  if (!result.data) {
    throw new Error(
      "Kotak TOTP login returned non-JSON response. " +
      "HTTP " +
      response.status +
      ". Raw: " +
      result.text.slice(0, 500)
    );
  }

  if (!response.ok) {
    const message =
      result.data?.error?.[0]?.message ||
      result.data?.error?.message ||
      result.data?.message ||
      "Kotak TOTP login failed.";

    throw new Error(
      message +
      " [HTTP " +
      response.status +
      "]"
    );
  }

  const root =
    result.data?.data ||
    result.data;

  const sid =
    root?.sid ||
    root?.Sid ||
    root?.viewSid;

  const auth =
    root?.token ||
    root?.Auth ||
    root?.auth ||
    root?.viewToken;

  if (!sid || !auth) {
    throw new Error(
      "Kotak TOTP login response received but Sid/Auth missing. " +
      "Response: " +
      JSON.stringify(result.data).slice(0, 1000)
    );
  }

  return {
    sid,
    auth
  };
}

async function kotakValidate(session) {
  const response = await fetch(
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

  const result = await readJson(response);

  if (!result.data) {
    throw new Error(
      "Kotak MPIN validation returned non-JSON response. " +
      "HTTP " +
      response.status +
      ". Raw: " +
      result.text.slice(0, 500)
    );
  }

  if (!response.ok) {
    const message =
      result.data?.error?.[0]?.message ||
      result.data?.error?.message ||
      result.data?.message ||
      "Kotak MPIN validation failed.";

    throw new Error(
      message +
      " [HTTP " +
      response.status +
      "]"
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
      "MPIN validation succeeded but baseUrl was not returned. " +
      "Response: " +
      JSON.stringify(result.data).slice(0, 1000)
    );
  }

  return {
    baseUrl:
      String(baseUrl).replace(/\/+$/, "")
  };
}

async function getScripmaster() {
  const response = await fetch(
    SCRIPMASTER_URL,
    {
      method: "GET",

      headers: {
        Accept: "text/csv"
      },

      cache: "no-store"
    }
  );

  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      "Scripmaster download failed. HTTP " +
      response.status +
      ". Raw: " +
      text.slice(0, 500)
    );
  }

  if (!text.trim()) {
    throw new Error(
      "Scripmaster returned empty response."
    );
  }

  return text;
}

async function getQuotes(baseUrl, symbolMap) {
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
      "No Nifty 50 Neo symbols resolved from Scripmaster."
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
    await readJson(response);

  if (!result.data) {
    return {
      success: false,
      status: response.status,

      error:
        "Kotak Neo returned non-JSON response.",

      rawResponse:
        result.text,

      resolved,
      missing
    };
  }

  if (!response.ok) {
    return {
      success: false,
      status: response.status,

      error:
        "Kotak Neo Quotes request failed.",

      kotakResponse:
        result.data,

      resolved,
      missing
    };
  }

  return {
    success: true,
    status: response.status,

    missing,
    resolved,

    data:
      result.data
  };
}

export default async function handler(req, res) {

  // ============================================
  // METHOD CHECK
  // ============================================

  if (req.method !== "POST") {
    return send(res, 405, {
      success: false,
      error:
        "Use POST method."
    });
  }

  // ============================================
  // ENVIRONMENT CHECK
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
