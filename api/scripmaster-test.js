// ============================================
// PROTOTYPE-1
// KOTAK NEO SCRIP MASTER SYMBOL CHECK
// api/scripmaster-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const masterUrl =
    "https://lapi.kotaksecurities.com/wso2-scripmaster/v1/prod/2026-08-12/transformed-v1/nse_cm-v1.csv";

  try {

    const response = await fetch(masterUrl, {
      method: "GET",
      headers: {
        "Accept": "text/csv"
      }
    });

    const csvText = await response.text();

    if (!response.ok) {
      return res.status(response.status).json({
        success: false,
        source: "KOTAK NEO",
        error: "Scrip Master download failed.",
        status: response.status,
        rawResponse: csvText.substring(0, 3000)
      });
    }

    const lines = csvText
      .split(/\r?\n/)
      .filter(function(line) {
        return line.trim() !== "";
      });

    if (lines.length < 2) {
      return res.status(502).json({
        success: false,
        error: "Scrip Master CSV is empty."
      });
    }

    // ----------------------------------------
    // CSV PARSER
    // ----------------------------------------

    function parseCsvLine(line) {

      const values = [];
      let current = "";
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {

        const char = line[i];

        if (char === '"') {

          if (
            insideQuotes &&
            line[i + 1] === '"'
          ) {
            current += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }

          continue;
        }

        if (
          char === "," &&
          !insideQuotes
        ) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      values.push(current.trim());

      return values;
    }

    // ----------------------------------------
    // HEADER
    // ----------------------------------------

    const header =
      parseCsvLine(lines[0]);

    const symbolIndex =
      header.indexOf("pSymbol");

    const exchangeIndex =
      header.indexOf("pExchSeg");

    const tradingSymbolIndex =
      header.indexOf("pTrdSymbol");

    const refKeyIndex =
      header.indexOf("pScripRefKey");

    const tokenIndex =
      header.indexOf("pToken");

    if (
      symbolIndex === -1 ||
      exchangeIndex === -1 ||
      tradingSymbolIndex === -1 ||
      refKeyIndex === -1
    ) {
      return res.status(502).json({
        success: false,
        error: "Required columns not found.",
        header: header
      });
    }

    // ----------------------------------------
    // TEST SYMBOLS
    // ----------------------------------------

    const testSymbols = [
      "HDFCBANK",
      "TCS",
      "RELIANCE",
      "INFY"
    ];

    const results = [];

    // ----------------------------------------
    // SEARCH
    // ----------------------------------------

    for (let i = 1; i < lines.length; i++) {

      const row =
        parseCsvLine(lines[i]);

      const symbol =
        row[symbolIndex] || "";

      const exchange =
        row[exchangeIndex] || "";

      if (
        exchange === "nse_cm" &&
        testSymbols.includes(symbol)
      ) {

        results.push({

          pSymbol:
            symbol,

          pExchSeg:
            exchange,

          pTrdSymbol:
            row[tradingSymbolIndex] || "",

          pScripRefKey:
            row[refKeyIndex] || "",

          pToken:
            tokenIndex >= 0
              ? row[tokenIndex] || ""
              : "",

          rawRow:
            row

        });

      }
    }

    // ----------------------------------------
    // MISSING
    // ----------------------------------------

    const missing =
      testSymbols.filter(function(symbol) {

        return !results.some(function(item) {
          return item.pSymbol === symbol;
        });

      });

    // ----------------------------------------
    // RESPONSE
    // ----------------------------------------

    return res.status(200).json({

      success: true,

      source:
        "KOTAK NEO",

      marketData:
        "SCRIPMASTER",

      file:
        "nse_cm-v1.csv",

      totalCsvLines:
        lines.length,

      symbolsRequested:
        testSymbols,

      totalMatches:
        results.length,

      missing:
        missing,

      stocks:
        results

    });

  } catch (error) {

    console.error(
      "Scrip Master Symbol Check Error:",
      error
    );

    return res.status(500).json({

      success: false,

      source:
        "KOTAK NEO",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
