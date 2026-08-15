// ============================================
// PROTOTYPE-1
// KOTAK NEO QUOTES DIAGNOSTIC
// api/quotes.js
// ============================================

const ACCESS_TOKEN = String(
  process.env.NEO_ACCESS_TOKEN || ""
).trim();

const SCRIPMASTER_URL =
  "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-12/transformed-v1/nse_cm-v1.csv";

function send(res, status, body) {
  return res.status(status).json(body);
}

async function readResponse(response) {
  const text = await response.text();

  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {}

  return {
    text,
    data
  };
}

function parseCsvLine(line) {
  const values = [];

  let current = "";
  let quoted = false;

  for (let i = 0; i < line.length; i++) {
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

function findHdfcRows(csvText) {

  const lines =
    csvText
      .split(/\r?\n/)
      .filter(Boolean);

  if (lines.length < 2) {

    throw new Error(
      "SCRIPMASTER CSV empty hai."
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
      "Required Scripmaster fields missing. Header: " +
      header.join(", ")
    );
  }

  const rows = [];

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

    const ref =
      pScripRefKey
        .toUpperCase()
        .replace(
          /-EQ$/i,
          ""
        );

    const trading =
      pTrdSymbol
        .toUpperCase()
        .replace(
          /-EQ$/i,
          ""
        );

    if (
      ref === "HDFCBANK" ||
      trading === "HDFCBANK"
    ) {

      rows.push({
        pSymbol,
        pTrdSymbol,
        pScripRefKey
      });
    }
  }

  if (!rows.length) {

    throw new Error(
      "HDFCBANK Scripmaster row nahi mila."
    );
  }

  return rows;
}

function unique(values) {

  return [
    ...new Set(
      values
        .map(
          value =>
            String(
              value || ""
            ).trim()
        )
        .filter(Boolean)
    )
  ];
}

async function testQuote(
  baseUrl,
  identifier
) {

  const cleanBaseUrl =
    String(baseUrl)
      .replace(
        /\/+$/,
        ""
      );

  const url =
    cleanBaseUrl +
    "/script-details/1.0/quotes/neosymbol/" +
    encodeURIComponent(
      identifier
    ) +
    "/all";

  const response =
    await fetch(
      url,
      {
        method: "GET",

        headers: {

          Authorization:
            ACCESS_TOKEN,

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
    await readResponse(
      response
    );

  return {

    identifier,

    httpStatus:
      response.status,

    ok:
      response.ok,

    json:
      Boolean(
        result.data
      ),

    response:
      result.data ||
      result.text.slice(
        0,
        1200
      )
  };
}

export default async function handler(
  req,
  res
) {

  // ============================================
  // METHOD
  // ============================================

  if (
    req.method !== "POST"
  ) {

    return send(
      res,
      405,
      {
        success: false,

        step:
          "METHOD",

        error:
          "Use POST method."
      }
    );
  }

  // ============================================
  // ACCESS TOKEN
  // ============================================

  if (!ACCESS_TOKEN) {

    return send(
      res,
      500,
      {
        success: false,

        step:
          "ENVIRONMENT",

        error:
          "NEO_ACCESS_TOKEN missing."
      }
    );
  }

  try {

    // ==========================================
    // 1. DOWNLOAD SCRIPMASTER
    // ==========================================

    const csv =
      await getScripmaster();

    // ==========================================
    // 2. FIND HDFCBANK
    // ==========================================

    const rows =
      findHdfcRows(
        csv
      );

    // ==========================================
    // 3. BUILD POSSIBLE IDENTIFIERS
    // ==========================================

    const identifiers =
      unique(
        rows.flatMap(
          row => [
            row.pSymbol,
            row.pScripRefKey,
            row.pTrdSymbol
          ]
        )
      );

    // ==========================================
    // 4. BASE URL
    // ==========================================

    const baseUrl =
      process.env.NEO_QUOTE_BASE_URL ||
      "https://mis.kotaksecurities.com";

    // ==========================================
    // 5. TEST IDENTIFIERS
    // ==========================================

    const results = [];

    for (
      const identifier of
      identifiers.slice(0, 6)
    ) {

      const result =
        await testQuote(
          baseUrl,
          identifier
        );

      results.push(
        result
      );

      if (
        result.ok &&
        result.json
      ) {
        break;
      }
    }

    // ==========================================
    // 6. FIND WORKING IDENTIFIER
    // ==========================================

    const working =
      results.find(
        item =>
          item.ok &&
          item.json
      );

    // ==========================================
    // RESPONSE
    // ==========================================

    return send(
      res,
      working
        ? 200
        : 502,
      {

        success:
          Boolean(
            working
          ),

        step:
          working
            ? "QUOTE_IDENTIFIER_FOUND"
            : "QUOTE_IDENTIFIER_TEST",

        stock:
          "HDFCBANK",

        testedIdentifiers:
          results.map(
            item => ({

              identifier:
                item.identifier,

              httpStatus:
                item.httpStatus,

              ok:
                item.ok,

              json:
                item.json
            })
          ),

        workingIdentifier:
          working
            ? working.identifier
            : null,

        workingResponse:
          working
            ? working.response
            : null,

        allResponses:
          results
      }
    );

  } catch (error) {

    return send(
      res,
      502,
      {

        success:
          false,

        step:
          "DIAGNOSTIC",

        error:
          error?.message ||
          String(error)
      }
    );
  }
}
