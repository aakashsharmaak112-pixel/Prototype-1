// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 QUOTES - DEBUG
// api/quotes.js
// ============================================

const CONSUMER_KEY = String(
  process.env.NEO_CONSUMER_KEY ||
  process.env.NEO_ACCESS_TOKEN ||
  ""
).trim();

const BASE_URL = String(
  process.env.NEO_QUOTE_BASE_URL ||
  "https://mnapi.kotaksecurities.com"
).replace(/\/+$/, "");

const MASTER_PATH =
  "/script-details/1.0/masterscrip/file-paths";

function send(res, status, body) {
  return res.status(status).json(body);
}

async function requestJson(url, stage) {
  try {
    const response = await fetch(url, {
      method: "GET",

      headers: {
        Authorization: CONSUMER_KEY,
        "Content-Type":
          "application/x-www-form-urlencoded",
        Accept:
          "application/json"
      },

      cache: "no-store"
    });

    const text = await response.text();

    let data = null;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {}

    return {
      success: true,
      stage,
      url,
      httpStatus: response.status,
      ok: response.ok,
      data,
      raw: data
        ? null
        : text.slice(0, 2000)
    };

  } catch (error) {
    return {
      success: false,
      stage,
      url,
      error: error?.message || String(error),
      cause:
        error?.cause?.message ||
        String(error?.cause || "")
    };
  }
}

async function requestCsv(url) {
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
      success: true,
      url,
      httpStatus: response.status,
      ok: response.ok,
      text: response.ok
        ? text
        : text.slice(0, 2000)
    };

  } catch (error) {
    return {
      success: false,
      url,
      error: error?.message || String(error),
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
      "Required fields missing. Header: " +
      header.join(", ")
    );
  }

  const candidates = [];

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

    const tradingClean =
      pTrdSymbol
        .toUpperCase()
        .replace(
          /-EQ$/i,
          ""
        );

    const refClean =
      pScripRefKey
        .toUpperCase()
        .replace(
          /-EQ$/i,
          ""
        );

    if (
      tradingClean ===
        "HDFCBANK" ||
      refClean ===
        "HDFCBANK"
    ) {
      candidates.push({
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
    candidates
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

  const encoded =
    encodeURIComponent(
      neoSymbol
    );

  const url =
    BASE_URL +
    "/script-details/1.0/quotes/neosymbol/" +
    encoded +
    "/all";

  return requestJson(
    url,
    "QUOTE_REQUEST"
  );
}

async function run() {
  if (!CONSUMER_KEY) {
    return {
      success: false,
      step: "ENVIRONMENT",
      error:
        "NEO_CONSUMER_KEY missing."
    };
  }

  // ==========================================
  // 1. SCRIP MASTER PATH API
  // ==========================================

  const masterUrl =
    BASE_URL +
    MASTER_PATH;

  const master =
    await requestJson(
      masterUrl,
      "SCRIP_MASTER_PATH"
    );

  if (!master.success) {
    return {
      success: false,
      step:
        "SCRIP_MASTER_PATH",
      details: master
    };
  }

  if (!master.ok) {
    return {
      success: false,
      step:
        "SCRIP_MASTER_PATH_HTTP",
      details: master
    };
  }

  const data =
    master.data?.data ||
    master.data;

  const files =
    data?.filesPaths ||
    [];

  if (
    !Array.isArray(files) ||
    !files.length
  ) {
    return {
      success: false,
      step:
        "SCRIP_MASTER_PATH_RESPONSE",

      masterResponse:
        master.data
    };
  }

  // ==========================================
  // 2. FIND NSE-CM FILE
  // ==========================================

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

      availableFiles:
        files
    };
  }

  // ==========================================
  // 3. DOWNLOAD CSV
  // ==========================================

  const csvResult =
    await requestCsv(
      nseFile
    );

  if (!csvResult.success) {
    return {
      success: false,

      step:
        "SCRIP_MASTER_CSV_FETCH",

      fileUrl:
        nseFile,

      details:
        csvResult
    };
  }

  if (!csvResult.ok) {
    return {
      success: false,

      step:
        "SCRIP_MASTER_CSV_HTTP",

      fileUrl:
        nseFile,

      httpStatus:
        csvResult.httpStatus,

      response:
        csvResult.text
    };
  }

  // ==========================================
  // 4. FIND HDFCBANK
  // ==========================================

  const stock =
    findHdfcBank(
      csvResult.text
    );

  if (
    !stock.candidates.length
  ) {
    return {
      success: false,

      step:
        "HDFCBANK_TOKEN_NOT_FOUND",

      header:
        stock.header
    };
  }

  // ==========================================
  // 5. QUOTE
  // ==========================================

  const results = [];

  for (
    const candidate of
    stock.candidates
  ) {
    const quote =
      await getQuote(
        candidate.instrument_token
      );

    results.push({
      candidate,
      quote
    });

    if (
      quote.success &&
      quote.ok
    ) {
      break;
    }
  }

  const working =
    results.find(
      item =>
        item.quote.success &&
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

    scripMasterFile:
      nseFile,

    candidates:
      stock.candidates,

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
        step: "METHOD",
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
