
// ============================================
// PROTOTYPE-1
// KOTAK NEO SCRIP MASTER SEARCH
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

    function parseCsvLine(line) {

      const values = [];
      let current = "";
      let insideQuotes = false;

      for (let i = 0; i < line.length; i++) {

        const char = line[i];

        if (char === '"') {
          insideQuotes = !insideQuotes;
          continue;
        }

        if (char === "," && !insideQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }

      values.push(current.trim());

      return values;
    }

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

    const searchSymbols = [
      "HDFCBANK",
      "TCS",
      "RELIANCE",
      "INFY"
    ];

    const results = [];

    for (let i = 1; i < lines.length; i++) {

      const row =
        parseCsvLine(lines[i]);

      const exchange =
        row[exchangeIndex] || "";

      if (exchange !== "nse_cm") {
        continue;
      }

      const symbol =
        row[symbolIndex] || "";

      const tradingSymbol =
        row[tradingSymbolIndex] || "";

      const refKey =
        row[refKeyIndex] || "";

      const combinedText =
        (
          symbol +
          " " +
          tradingSymbol +
          " " +
          refKey
        ).toUpperCase();

      for (const search of searchSymbols) {

        if (
          combinedText.includes(search)
        ) {

          results.push({

            searchedFor:
              search,

            pSymbol:
              symbol,

            pTrdSymbol:
              tradingSymbol,

            pScripRefKey:
              refKey,

            pToken:
              tokenIndex >= 0
                ? row[tokenIndex] || ""
                : "",

            pExchSeg:
              exchange

          });

          break;
        }
      }
    }

    return res.status(200).json({

      success: true,

      source:
        "KOTAK NEO",

      marketData:
        "SCRIPMASTER",

      totalCsvLines:
        lines.length,

      searchedSymbols:
        searchSymbols,

      totalMatches:
        results.length,

      stocks:
        results

    });

  } catch (error) {

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
