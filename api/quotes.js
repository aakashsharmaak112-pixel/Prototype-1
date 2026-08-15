// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES - V2
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

  const text =
    await response.text();

  let data = null;

  try {
    data =
      text
        ? JSON.parse(text)
        : null;
  } catch (_) {}

  return {
    text,
    data
  };
}


// ============================================
// FIND FIELD RECURSIVELY
// ============================================

function findField(
  value,
  names,
  depth = 0
) {

  if (!value || depth > 8) {
    return null;
  }

  if (Array.isArray(value)) {

    for (const item of value) {

      const found =
        findField(
          item,
          names,
          depth + 1
        );

      if (
        found !== null &&
        found !== undefined &&
        found !== ""
      ) {
        return found;
      }

    }

    return null;
  }

  if (
    typeof value !== "object"
  ) {
    return null;
  }

  for (const name of names) {

    if (
      Object.prototype.hasOwnProperty.call(
        value,
        name
      ) &&
      value[name] !== null &&
      value[name] !== undefined &&
      value[name] !== ""
    ) {

      return value[name];

    }

  }

  for (
    const key of Object.keys(value)
  ) {

    const found =
      findField(
        value[key],
        names,
        depth + 1
      );

    if (
      found !== null &&
      found !== undefined &&
      found !== ""
    ) {
      return found;
    }

  }

  return null;
}


// ============================================
// SAFE KEYS
// ============================================

function safeKeys(value) {

  if (
    !value ||
    typeof value !== "object"
  ) {
    return [];
  }

  if (Array.isArray(value)) {
    return ["ARRAY"];
  }

  return Object.keys(value);
}


// ============================================
// MOBILE
// ============================================

function normalizeMobile(value) {

  const mobile =
    String(value || "")
      .trim()
      .replace(/[^\d+]/g, "");

  if (
    /^\d{10}$/.test(mobile)
  ) {
    return "+91" + mobile;
  }

  return mobile;
}


// ============================================
// CSV PARSER
// ============================================

function parseCsvLine(line) {

  const values = [];

  let current = "";

  let quoted = false;

  for (
    let i = 0;
    i < line.length;
    i++
  ) {

    const ch = line[i];

    if (ch === '"') {

      if (
        quoted &&
        line[i + 1] === '"'
      ) {

        current += '"';

        i++;

      } else {

        quoted = !quoted;

      }

      continue;
    }

    if (
      ch === "," &&
      !quoted
    ) {

      values.push(
        current.trim()
      );

      current = "";

    } else {

      current += ch;

    }

  }

  values.push(
    current.trim()
  );

  return values;
}


// ============================================
// SCRIPMASTER MAP
// ============================================

function loadSymbolMap(csvText) {

  const lines =
    csvText
      .split(/\r?\n/)
      .filter(Boolean);

  if (
    lines.length < 2
  ) {

    throw new Error(
      "Scripmaster CSV is empty."
    );

  }

  const header =
    parseCsvLine(
      lines[0]
    );

  const iSymbol =
    header.indexOf(
      "pSymbol"
    );

  const iExchange =
    header.indexOf(
      "pExchSeg"
    );

  const iTrading =
    header.indexOf(
      "pTrdSymbol"
    );

  const iRef =
    header.indexOf(
      "pScripRefKey"
    );

  if (
    iSymbol < 0 ||
    iExchange < 0 ||
    iTrading < 0 ||
    iRef < 0
  ) {

    throw new Error(
      "Required Scripmaster fields missing: pSymbol/pExchSeg/pTrdSymbol/pScripRefKey."
    );

  }

  const map = {};

  for (
    let i = 1;
    i < lines.length;
    i++
  ) {

    const row =
      parseCsvLine(
        lines[i]
      );

    const exchange =
      String(
        row[iExchange] || ""
      )
        .trim()
        .toLowerCase();

    if (
      exchange !== "nse_cm"
    ) {
      continue;
    }

    const pSymbol =
      String(
        row[iSymbol] || ""
      ).trim();

    const pTrdSymbol =
      String(
        row[iTrading] || ""
      ).trim();

    const pScripRefKey =
      String(
        row[iRef] || ""
      ).trim();

    if (!pSymbol) {
      continue;
    }

    const symbol =
      pScripRefKey
        .toUpperCase()
        .replace(
          /-EQ$/i,
          ""
        );

    const tradingSymbol =
      pTrdSymbol
        .toUpperCase()
        .replace(
          /-EQ$/i,
          ""
        );

    for (
      const target of NIFTY_50
    ) {

      const cleanTarget =
        target.toUpperCase();

      if (
        symbol === cleanTarget ||
        tradingSymbol === cleanTarget
      ) {

        map[cleanTarget] = {

          symbol:
            cleanTarget,

          neoSymbol:
            pSymbol,

          pTrdSymbol,

          pScripRefKey

        };

        break;
      }

    }

  }

  return map;
}


// ============================================
// KOTAK TOTP LOGIN
// ============================================

async function kotakLogin(totp) {

  const mobileNumber =
    normalizeMobile(
      MOBILE
    );

  if (
    !/^\+91\d{10}$/.test(
      mobileNumber
    )
  ) {

    throw new Error(
      "Invalid NEO_MOBILE. Use 10 digit registered mobile number."
    );

  }

  const response =
    await fetch(
      LOGIN_URL,
      {

        method:
          "POST",

        headers: {

          Authorization:
            String(
              ACCESS_TOKEN
            ).trim(),

          "neo-fin-key":
            "neotradeapi",

          "Content-Type":
            "application/json",

          Accept:
            "application/json"

        },

        body:
          JSON.stringify({

            mobileNumber,

            ucc:
              String(
                UCC
              ).trim(),

            totp:
              String(
                totp
              ).trim()

          })

      }
    );

  const result =
    await readResponse(
      response
    );

  if (
    !result.data
  ) {

    throw new Error(
      "TOTP LOGIN returned non-JSON response. HTTP " +
      response.status +
      ". " +
      result.text.slice(
        0,
        500
      )
    );

  }

  if (
    !response.ok
  ) {

    const message =
      findField(
        result.data,
        [
          "message",
          "Message",
          "description"
        ]
      ) ||
      "Kotak TOTP login failed.";

    throw new Error(
      String(message)
    );

  }

  const sid =
    findField(
      result.data,
      [
        "sid",
        "Sid",
        "sessionId",
        "sessionID",
        "viewSid"
      ]
    );

  const auth =
    findField(
      result.data,
      [
        "Auth",
        "auth",
        "token",
        "Token",
        "viewToken"
      ]
    );

  if (
    !sid ||
    !auth
  ) {

    throw new Error(
      "TOTP LOGIN succeeded but Sid/Auth were not found. Detected root fields: " +
      safeKeys(
        result.data
      ).join(", ")
    );

  }

  return {

    sid:
      String(sid),

    auth:
      String(auth)

  };

}


// ============================================
// MPIN VALIDATION
// ============================================

async function kotakValidate(
  login
) {

  const response =
    await fetch(
      VALIDATE_URL,
      {

        method:
          "POST",

        headers: {

          Authorization:
            String(
              ACCESS_TOKEN
            ).trim(),

          "neo-fin-key":
            "neotradeapi",

          Sid:
            String(
              login.sid
            ).trim(),

          Auth:
            String(
              login.auth
            ).trim(),

          "Content-Type":
            "application/json",

          Accept:
            "application/json"

        },

        body:
          JSON.stringify({

            mpin:
              String(
                MPIN
              ).trim()

          })

      }
    );

  const result =
    await readResponse(
      response
    );

  if (
    !result.data
  ) {

    throw new Error(
      "MPIN VALIDATION returned non-JSON response. HTTP " +
      response.status +
      ". " +
      result.text.slice(
        0,
        500
      )
    );

  }

  if (
    !response.ok
  ) {

    const message =
      findField(
        result.data,
        [
          "message",
          "Message",
          "description"
        ]
      ) ||
      "Kotak MPIN validation failed.";

    throw new Error(
      String(message)
    );

  }

  const baseUrl =
    findField(
      result.data,
      [
        "baseUrl",
        "base_url",
        "BaseUrl",
        "BaseURL"
      ]
    );

  const sid =
    findField(
      result.data,
      [
        "sid",
        "Sid",
        "sessionId",
        "sessionID",
        "viewSid"
      ]
    ) ||
    login.sid;

  const auth =
    findField(
      result.data,
      [
        "Auth",
        "auth",
        "token",
        "Token",
        "viewToken"
      ]
    ) ||
    login.auth;

  if (
    !baseUrl
  ) {

    throw new Error(
      "MPIN validation succeeded but baseUrl was not returned. Detected fields: " +
      safeKeys(
        result.data
      ).join(", ")
    );

  }

  return {

    baseUrl:
      String(
        baseUrl
      ).replace(
        /\/+$/,
        ""
      ),

    sid:
      String(sid),

    auth:
      String(auth)

  };

}


// ============================================
// GET SCRIPMASTER
// ============================================

async function getScripmaster() {

  const response =
    await fetch(
      SCRIPMASTER_URL,
      {

        method:
          "GET",

        headers: {

          Accept:
            "text/csv"

        }

      }
    );

  const text =
    await response.text();

  if (
    !response.ok
  ) {

    throw new Error(
      "Scripmaster download failed. HTTP " +
      response.status
    );

  }

  return text;

}


// ============================================
// GET LIVE QUOTES
// ============================================

async function getQuotes(
  baseUrl,
  symbolMap
) {

  const resolved =
    NIFTY_50
      .map(
        symbol =>
          symbolMap[
            symbol
          ]
      )
      .filter(Boolean);

  const missing =
    NIFTY_50.filter(
      symbol =>
        !symbolMap[
          symbol
        ]
    );

  if (
    !resolved.length
  ) {

    throw new Error(
      "No Nifty 50 Neo symbols resolved."
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

        method:
          "GET",

        headers: {

          // IMPORTANT:
          // Plain Access Token.
          // NO Bearer prefix.

          Authorization:
            String(
              ACCESS_TOKEN
            ).trim(),

          Accept:
            "application/json"

        }

      }
    );

  const result =
    await readResponse(
      response
    );

  if (
    !result.data
  ) {

    return {

      success:
        false,

      status:
        response.status,

      error:
        "Kotak Neo returned non-JSON response.",

      rawResponse:
        result.text.slice(
          0,
          3000
        ),

      resolved,

      missing

    };

  }

  if (
    !response.ok
  ) {

    return {

      success:
        false,

      status:
        response.status,

      error:
        "Kotak Neo Quotes request failed.",

      kotakResponse:
        result.data,

      resolved,

      missing

    };

  }

  let quoteArray = null;

  if (
    Array.isArray(
      result.data
    )
  ) {

    quoteArray =
      result.data;

  }

  else if (
    Array.isArray(
      result.data.data
    )
  ) {

    quoteArray =
      result.data.data;

  }

  else if (
    Array.isArray(
      result.data.result
    )
  ) {

    quoteArray =
      result.data.result;

  }

  else if (
    Array.isArray(
      result.data?.data?.data
    )
  ) {

    quoteArray =
      result.data.data.data;

  }

  if (
    !quoteArray
  ) {

    return {

      success:
        false,

      status:
        response.status,

      error:
        "Kotak responded successfully but no quote array was found.",

      kotakResponse:
        result.data,

      resolved,

      missing

    };

  }

  return {

    success:
      true,

    status:
      response.status,

    resolved,

    missing,

    data:
      quoteArray

  };

}


// ============================================
// MAIN API
// ============================================

export default async function handler(
  req,
  res
) {

  if (
    req.method !== "POST"
  ) {

    return send(
      res,
      405,
      {

        success:
          false,

        error:
          "Use POST method."

      }
    );

  }

  const missingEnv = [];

  if (!ACCESS_TOKEN)
    missingEnv.push(
      "NEO_ACCESS_TOKEN"
    );

  if (!MOBILE)
    missingEnv.push(
      "NEO_MOBILE"
    );

  if (!UCC)
    missingEnv.push(
      "NEO_UCC"
    );

  if (!MPIN)
    missingEnv.push(
      "NEO_MPIN"
    );

  if (
    missingEnv.length
  ) {

    return send(
      res,
      500,
      {

        success:
          false,

        error:
          "Required environment variables missing.",

        missingEnv

      }
    );

  }

  const totp =
    String(
      req.body?.totp || ""
    ).trim();

  if (
    !/^\d{6}$/.test(
      totp
    )
  ) {

    return send(
      res,
      400,
      {

        success:
          false,

        error:
          "Current 6-digit TOTP required."

      }
    );

  }

  if (
    !/^\d{6}$/.test(
      String(
        MPIN
      ).trim()
    )
  ) {

    return send(
      res,
      500,
      {

        success:
          false,

        error:
          "NEO_MPIN must contain exactly 6 digits."

      }
    );

  }

  try {

    // STEP 1
    const login =
      await kotakLogin(
        totp
      );

    // STEP 2
    const session =
      await kotakValidate(
        login
      );

    // STEP 3
    const csv =
      await getScripmaster();

    const symbolMap =
      loadSymbolMap(
        csv
      );

    // STEP 4
    const quotes =
      await getQuotes(
        session.baseUrl,
        symbolMap
      );

    if (
      !quotes.success
    ) {

      return send(
        res,
        502,
        {

          success:
            false,

          source:
            "KOTAK NEO",

          step:
            "QUOTES",

          status:
            quotes.status,

          error:
            quotes.error,

          baseUrlFound:
            Boolean(
              session.baseUrl
            ),

          sidFound:
            Boolean(
              session.sid
            ),

          authFound:
            Boolean(
              session.auth
            ),

          resolvedCount:
            quotes.resolved.length,

          missingSymbols:
            quotes.missing,

          kotakResponse:
            quotes.kotakResponse,

          rawResponse:
            quotes.rawResponse

        }
      );

    }

    return send(
      res,
      200,
      {

        success:
          true,

        source:
          "KOTAK NEO",

        marketData:
          "LIVE",

        totalRequested:
          NIFTY_50.length,

        totalResolved:
          quotes.resolved.length,

        totalReceived:
          quotes.data.length,

        missingSymbols:
          quotes.missing,

        quotes:
          quotes.data

      }
    );

  }

  catch (error) {

    console.error(
      "Prototype-1 Kotak Quotes:",
      error
    );

    return send(
      res,
      502,
      {

        success:
          false,

        source:
          "KOTAK NEO",

        error:
          error.message ||
          "Unexpected Kotak Neo error."

      }
    );

  }

}
