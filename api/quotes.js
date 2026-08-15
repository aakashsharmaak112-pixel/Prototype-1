// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 QUOTES
// api/quotes.js
// ============================================

// Kotak Neo v2 uses consumer_key for API authentication.
// Keep the fallback for the existing Prototype-1 environment.
const CONSUMER_KEY = String(
  process.env.NEO_CONSUMER_KEY ||
  process.env.NEO_ACCESS_TOKEN ||
  ""
).trim();

const SCRIPMASTER_URL =
  "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-12/transformed-v1/nse_cm-v1.csv";

// Kotak Neo v2 production API
const QUOTE_BASE_URL =
  String(
    process.env.NEO_QUOTE_BASE_URL ||
    "https://mnapi.kotaksecurities.com"
  ).replace(/\/+$/, "");

function send(res, status, body) {
  return res.status(status).json(body);
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
      "SCRIPMASTER failed. HTTP " +
      response.status +
      ". " +
      text.slice(0, 500)
    );
  }

  if (!text.trim()) {
    throw new Error(
      "SCRIPMASTER CSV empty hai."
    );
  }

  return text;
}

function findHdfcBank(csvText) {
  const lines = csvText
    .split(/\r?\n/)
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "SCRIPMASTER CSV mein data nahi mila."
    );
  }

  const header = parseCsvLine(lines[0]);

  const indexes = {
    pSymbol: header.indexOf("pSymbol"),
    pExchSeg: header.indexOf("pExchSeg"),
    pTrdSymbol: header.indexOf("pTrdSymbol"),
    pScripRefKey: header.indexOf("pScripRefKey")
  };

  if (
    indexes.pSymbol < 0 ||
    indexes.pExchSeg < 0
  ) {
    throw new Error(
      "Required Scripmaster fields missing. Header: " +
      header.join(", ")
    );
  }

  const candidates = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseCsvLine(lines[i]);

    const exchange = String(
      row[indexes.pExchSeg] || ""
    )
      .trim()
      .toLowerCase();

    if (exchange !== "nse_cm") {
      continue;
    }

    const pSymbol = String(
      row[indexes.pSymbol] || ""
    ).trim();

    const pTrdSymbol =
      indexes.pTrdSymbol >= 0
        ? String(
            row[indexes.pTrdSymbol] || ""
          ).trim()
        : "";

    const pScripRefKey =
      indexes.pScripRefKey >= 0
        ? String(
            row[indexes.pScripRefKey] || ""
          ).trim()
        : "";

    const tradingClean = pTrdSymbol
      .toUpperCase()
      .replace(/-EQ$/i, "");

    const refClean = pScripRefKey
      .toUpperCase()
      .replace(/-EQ$/i, "");

    if (
      tradingClean === "HDFCBANK" ||
      refClean === "HDFCBANK"
    ) {
      candidates.push({
        instrument_token: pSymbol,
        exchange_segment: "nse_cm",
        pSymbol,
        pTrdSymbol,
        pScripRefKey
      });
    }
  }

  if (!candidates.length) {
    throw new Error(
      "HDFCBANK ka NSE-CM Scripmaster token nahi mila."
    );
  }

  return candidates;
}

async function getQuote(instrumentToken) {
  const url =
    QUOTE_BASE_URL +
    "/script-details/1.0/quotes";

  const payload = {
    instrument_tokens: [
      {
        instrument_token: String(
          instrumentToken
        ),
        exchange_segment: "nse_cm"
      }
    ],

    quote_type: "all"
  };

  const response = await fetch(
    url,
    {
      method: "POST",

      headers: {
        Authorization: CONSUMER_KEY,

        "Content-Type":
          "application/json",

        Accept:
          "application/json"
      },

      body: JSON.stringify(payload),

      cache: "no-store"
    }
  );

  const text = await response.text();

  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {}

  return {
    httpStatus: response.status,

    ok: response.ok,

    request: payload,

    response:
      data ||
      text.slice(0, 2000)
  };
}

export default async function handler(
  req,
  res
) {
  // ============================================
  // METHOD
  // ============================================

  if (req.method !== "POST") {
    return send(
      res,
      405,
      {
        success: false,

        step: "METHOD",

        error:
          "Use POST method."
      }
    );
  }

  // ============================================
  // AUTH CONFIG
  // ============================================

  if (!CONSUMER_KEY) {
    return send(
      res,
      500,
      {
        success: false,

        step: "ENVIRONMENT",

        error:
          "NEO_CONSUMER_KEY missing."
      }
    );
  }

  try {
    // ==========================================
    // 1. SCRIPMASTER
    // ==========================================

    const csv =
      await getScripmaster();

    // ==========================================
    // 2. HDFCBANK TOKEN
    // ==========================================

    const candidates =
      findHdfcBank(csv);

    // ==========================================
    // 3. TRY CANDIDATES
    // ==========================================

    const quoteResults = [];

    for (
      const candidate of candidates
    ) {
      const result =
        await getQuote(
          candidate.instrument_token
        );

      quoteResults.push({
        candidate,
        result
      });

      if (result.ok) {
        break;
      }
    }

    // ==========================================
    // 4. WORKING RESPONSE
    // ==========================================

    const working =
      quoteResults.find(
        item =>
          item.result.ok
      );

    // ==========================================
    // 5. RESPONSE
    // ==========================================

    return send(
      res,
      working ? 200 : 502,
      {
        success:
          Boolean(working),

        step:
          working
            ? "QUOTE_SUCCESS"
            : "QUOTE_FAILED",

        stock:
          "HDFCBANK",

        quoteBaseUrl:
          QUOTE_BASE_URL,

        candidates,

        workingToken:
          working
            ? working.candidate
                .instrument_token
            : null,

        workingResponse:
          working
            ? working.result.response
            : null,

        allResponses:
          quoteResults
      }
    );

  } catch (error) {
    return send(
      res,
      502,
      {
        success: false,

        step:
          "DIAGNOSTIC",

        error:
          error?.message ||
          String(error)
      }
    );
  }
}
