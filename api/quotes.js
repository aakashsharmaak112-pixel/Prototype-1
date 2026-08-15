// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 QUOTES
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

const SCRIP_MASTER_PATH =
  "/script-details/1.0/masterscrip/file-paths";

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

// ============================================
// GET CURRENT SCRIP MASTER FILE PATH
// ============================================

async function getScripMasterPath() {
  const url =
    BASE_URL +
    SCRIP_MASTER_PATH;

  const response = await fetch(
    url,
    {
      method: "GET",

      headers: {
        Authorization:
          CONSUMER_KEY,

        "Content-Type":
          "application/x-www-form-urlencoded",

        Accept:
          "application/json"
      },

      cache: "no-store"
    }
  );

  const text =
    await response.text();

  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {}

  if (!response.ok) {
    throw new Error(
      "Scrip Master API failed. HTTP " +
      response.status +
      ". " +
      text.slice(0, 1000)
    );
  }

  const files =
    data?.data?.filesPaths ||
    data?.filesPaths ||
    [];

  if (!Array.isArray(files) || !files.length) {
    throw new Error(
      "Scrip Master API ne filesPaths nahi diya. Response: " +
      JSON.stringify(data).slice(0, 2000)
    );
  }

  const nseFile =
    files.find(
      file =>
        String(file)
          .toLowerCase()
          .includes("nse_cm")
    );

  if (!nseFile) {
    throw new Error(
      "NSE-CM Scrip Master file nahi mili. Files: " +
      JSON.stringify(files)
    );
  }

  return {
    apiResponse: data,
    fileUrl: nseFile
  };
}

// ============================================
// DOWNLOAD CURRENT NSE-CM CSV
// ============================================

async function downloadScripMaster(
  fileUrl
) {
  const response =
    await fetch(
      fileUrl,
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
      "NSE-CM CSV download failed. HTTP " +
      response.status +
      ". " +
      text.slice(0, 1000)
    );
  }

  if (!text.trim()) {
    throw new Error(
      "NSE-CM Scrip Master CSV empty hai."
    );
  }

  return text;
}

// ============================================
// FIND HDFCBANK TOKEN
// ============================================

function findHdfcBank(csvText) {
  const lines =
    csvText
      .split(/\r?\n/)
      .filter(Boolean);

  if (lines.length < 2) {
    throw new Error(
      "Scrip Master CSV mein data nahi mila."
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

  if (!candidates.length) {
    throw new Error(
      "HDFCBANK ka NSE-CM token nahi mila."
    );
  }

  return {
    header,
    candidates
  };
}

// ============================================
// KOTAK NEO V2 QUOTE
// ============================================

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

  const response =
    await fetch(
      url,
      {
        method: "GET",

        headers: {
          Authorization:
            CONSUMER_KEY,

          "Content-Type":
            "application/x-www-form-urlencoded",

          Accept:
            "application/json"
        },

        cache:
          "no-store"
      }
    );

  const text =
    await response.text();

  let data = null;

  try {
    data = text
      ? JSON.parse(text)
      : null;
  } catch {}

  return {
    url,

    neoSymbol,

    httpStatus:
      response.status,

    ok:
      response.ok,

    response:
      data ||
      text.slice(
        0,
        3000
      )
  };
}

// ============================================
// MAIN QUOTE TEST
// ============================================

async function runQuoteTest() {
  if (!CONSUMER_KEY) {
    return {
      success: false,

      step:
        "ENVIRONMENT",

      error:
        "NEO_CONSUMER_KEY missing."
    };
  }

  // 1. Get current Scrip Master URL
  const masterInfo =
    await getScripMasterPath();

  // 2. Download current NSE-CM CSV
  const csv =
    await downloadScripMaster(
      masterInfo.fileUrl
    );

  // 3. Find HDFCBANK
  const stock =
    findHdfcBank(csv);

  // 4. Try HDFCBANK candidates
  const quoteResults = [];

  for (
    const candidate of
    stock.candidates
  ) {
    const result =
      await getQuote(
        candidate.instrument_token
      );

    quoteResults.push({
      candidate,
      result
    });

    if (
      result.ok
    ) {
      break;
    }
  }

  const working =
    quoteResults.find(
      item =>
        item.result.ok
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
      masterInfo.fileUrl,

    candidates:
      stock.candidates,

    workingToken:
      working
        ? working.candidate
            .instrument_token
        : null,

    workingNeoSymbol:
      working
        ? working.result
            .neoSymbol
        : null,

    workingResponse:
      working
        ? working.result
            .response
        : null,

    allResponses:
      quoteResults
  };
}

// ============================================
// VERCEL HANDLER
// ============================================

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
        success:
          false,

        step:
          "METHOD",

        error:
          "Use GET or POST method."
      }
    );
  }

  try {
    const result =
      await runQuoteTest();

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
        success:
          false,

        step:
          "QUOTE_DIAGNOSTIC",

        error:
          error?.message ||
          String(error)
      }
    );
  }
}
