// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 QUOTES
// api/quotes.js
// ============================================

const AUTH_TOKEN = String(
  process.env.NEO_ACCESS_TOKEN ||
  process.env.NEO_TRADE_TOKEN ||
  ""
).trim();

const BASE_URL = String(
  process.env.NEO_BASE_URL ||
  ""
).trim().replace(/\/+$/, "");

function send(res, status, body) {
  return res.status(status).json(body);
}

async function getJson(url, stage) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: AUTH_TOKEN,
        "Content-Type":
          "application/x-www-form-urlencoded",
        Accept: "application/json"
      },
      cache: "no-store"
    });

    const text = await response.text();

    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {}

    return {
      stage,
      url,
      httpStatus: response.status,
      ok: response.ok,
      response: data || text.slice(0, 3000)
    };
  } catch (error) {
    return {
      stage,
      url,
      ok: false,
      error:
        error?.message ||
        String(error),
      cause:
        error?.cause?.message ||
        String(error?.cause || "")
    };
  }
}

async function getCsv(url) {
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/csv"
      },
      cache: "no-store"
    });

    const text = await response.text();

    return {
      url,
      httpStatus: response.status,
      ok: response.ok,
      text: response.ok
        ? text
        : text.slice(0, 2000)
    };
  } catch (error) {
    return {
      url,
      ok: false,
      error:
        error?.message ||
        String(error),
      cause:
        error?.cause?.message ||
        String(error?.cause || "")
    };
  }
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

function findHdfcBank(csvText) {
  const lines =
    csvText
      .split(/\r?\n/)
      .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "Scrip Master CSV empty hai."
    );
  }

  const header =
    parseCsvLine(lines[0]);

  const iSymbol =
    header.indexOf("pSymbol");

  const iExchange =
    header.indexOf("pExchSeg");

  const iTrading =
    header.indexOf("pTrdSymbol");

  const iRef =
    header.indexOf("pScripRefKey");

  if (
    iSymbol < 0 ||
    iExchange < 0
  ) {
    throw new Error(
      "Required Scrip Master fields missing. Header: " +
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
      parseCsvLine(lines[i]);

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
      iTrading >= 0
        ? String(
            row[iTrading] || ""
          ).trim()
        : "";

    const pScripRefKey =
      iRef >= 0
        ? String(
            row[iRef] || ""
          ).trim()
        : "";

    const trading =
      pTrdSymbol
        .toUpperCase()
        .replace(
          /-EQ$/i,
          ""
        );

    const ref =
      pScripRefKey
        .toUpperCase()
        .replace(
          /-EQ$/i,
          ""
        );

    if (
      trading === "HDFCBANK" ||
      ref === "HDFCBANK"
    ) {
      rows.push({
        instrument_token:
          pSymbol,

        exchange_segment:
          "nse_cm",

        pSymbol,
        pTrdSymbol,
        pScripRefKey
      });
    }
  }

  return {
    header,
    rows
  };
}

async function getQuote(
  instrumentToken
) {
  const neoSymbol =
    "nse_cm|" +
    String(
      instrumentToken
    );

  const url =
    BASE_URL +
    "/script-details/1.0/quotes/neosymbol/" +
    encodeURIComponent(
      neoSymbol
    ) +
    "/all";

  return getJson(
    url,
    "QUOTE"
  );
}

async function run() {
  if (!AUTH_TOKEN) {
    return {
      success: false,

      step:
        "ENVIRONMENT",

      error:
        "NEO_ACCESS_TOKEN / NEO_TRADE_TOKEN missing."
    };
  }

  if (!BASE_URL) {
    return {
      success: false,

      step:
        "ENVIRONMENT",

      error:
        "NEO_BASE_URL missing."
    };
  }

  // ==========================================
  // 1. CURRENT SCRIP MASTER PATH
  // ==========================================

  const masterUrl =
    BASE_URL +
    "/script-details/1.0/masterscrip/file-paths";

  const master =
    await getJson(
      masterUrl,
      "SCRIP_MASTER_PATH"
    );

  if (!master.ok) {
    return {
      success: false,

      step:
        "SCRIP_MASTER_FAILED",

      details:
        master
    };
  }

  // ==========================================
  // 2. FIND NSE-CM CSV
  // ==========================================

  const masterData =
    master.response?.data ||
    master.response;

  const files =
    masterData?.filesPaths ||
    [];

  if (
    !Array.isArray(files) ||
    !files.length
  ) {
    return {
      success: false,

      step:
        "SCRIP_MASTER_FILES_MISSING",

      masterResponse:
        master.response
    };
  }

  const nseFile =
    files.find(
      file =>
        String(file)
          .toLowerCase()
          .includes("nse_cm")
    );

  if (!nseFile) {
    return {
      success: false,

      step:
        "NSE_CM_FILE_NOT_FOUND",

      files
    };
  }

  // ==========================================
  // 3. DOWNLOAD CURRENT CSV
  // ==========================================

  const csv =
    await getCsv(
      nseFile
    );

  if (!csv.ok) {
    return {
      success: false,

      step:
        "SCRIP_MASTER_CSV_FAILED",

      fileUrl:
        nseFile,

      details:
        csv
    };
  }

  // ==========================================
  // 4. FIND HDFCBANK
  // ==========================================

  const stock =
    findHdfcBank(
      csv.text
    );

  if (
    !stock.rows.length
  ) {
    return {
      success: false,

      step:
        "HDFCBANK_NOT_FOUND",

      header:
        stock.header
    };
  }

  // ==========================================
  // 5. QUOTE
  // ==========================================

  const results = [];

  for (
    const row of stock.rows
  ) {
    const quote =
      await getQuote(
        row.instrument_token
      );

    results.push({
      scrip:
        row,

      quote
    });

    if (
      quote.ok
    ) {
      break;
    }
  }

  const working =
    results.find(
      item =>
        item.quote.ok
    );

  return {
    success:
      Boolean(working),

    step:
      working
        ? "QUOTE_SUCCESS"
        : "QUOTE_FAILED",

    stock:
      "HDFCBANK",

    baseUrl:
      BASE_URL,

    scripMasterFile:
      nseFile,

    candidates:
      stock.rows,

    results
  };
}

export default async function handler(
  req,
  res
) {
  if (
    req.method !== "GET" &&
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
          "Use GET or POST method."
      }
    );
  }

  try {
    const result =
      await run();

    return send(
      res,
      result.success
        ? 200
        : 502,
      result
    );

  } catch (error) {
    return send(
      res,
      502,
      {
        success: false,

        step:
          "UNHANDLED_ERROR",

        error:
          error?.message ||
          String(error),

        cause:
          error?.cause?.message ||
          String(
            error?.cause || ""
          )
      }
    );
  }
}
