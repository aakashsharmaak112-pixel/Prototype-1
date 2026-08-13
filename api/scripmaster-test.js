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

    // ========================================
    // DOWNLOAD SCRIPMASTER
    // ========================================

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

    // ========================================
    // CSV LINES
    // ========================================

    const lines = csvText
      .split(/\r?\n/)
      .filter(function(line) {
        return line.trim() !== "";
      });

    if (lines.length < 2) {
      return res.status(502).json({
        success: false,
        source: "KOTAK NEO",
        error: "Scrip Master CSV is empty or invalid."
      });
    }

    // ========================================
    // CSV PARSER
    // ========================================

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

    // ========================================
    // HEADER
    // ========================================

    const header =
      parseCsvLine(lines[0]);

    function getIndex(name) {
      return header.indexOf(name);
    }

    const symbolIndex =
      getIndex("pSymbol");

    const exchangeIndex =
      getIndex("pExchSeg");

    const tradingSymbolIndex =
      getIndex("pTrdSymbol");

    const refKeyIndex =
      getIndex("pScripRefKey");

    const combinedSymbolIndex =
      getIndex("pCombinedSymbol");

    const contractIdIndex =
      getIndex("pContractId");

    const instrumentTypeIndex =
      getIndex("pInstType");

    const symbolNameIndex =
      getIndex("pSymbolName");

    const exchangeNameIndex =
      getIndex("pExchange");

    const seriesIndex =
      getIndex("pSeries");

    // ========================================
    // REQUIRED FIELD CHECK
    // ========================================

    const missingFields = [];

    if (symbolIndex < 0) {
      missingFields.push("pSymbol");
    }

    if (exchangeIndex < 0) {
      missingFields.push("pExchSeg");
    }

    if (tradingSymbolIndex < 0) {
      missingFields.push("pTrdSymbol");
    }

    if (refKeyIndex < 0) {
      missingFields.push("pScripRefKey");
    }

    if (missingFields.length > 0) {
      return res.status(502).json({
        success: false,
        source: "KOTAK NEO",
        error: "Required Scripmaster fields missing.",
        missingFields,
        availableHeaders: header
      });
    }

    // ========================================
    // STOCKS
    // ========================================

    const searchSymbols = [
      "HDFCBANK",
      "TCS",
      "RELIANCE",
      "INFY"
    ];

    const results = [];

    // ========================================
    // SEARCH
    // ========================================

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

      const combinedSymbol =
        combinedSymbolIndex >= 0
          ? row[combinedSymbolIndex] || ""
          : "";

      const contractId =
        contractIdIndex >= 0
          ? row[contractIdIndex] || ""
          : "";

      const instrumentType =
        instrumentTypeIndex >= 0
          ? row[instrumentTypeIndex] || ""
          : "";

      const symbolName =
        symbolNameIndex >= 0
          ? row[symbolNameIndex] || ""
          : "";

      const exchangeName =
        exchangeNameIndex >= 0
          ? row[exchangeNameIndex] || ""
          : "";

      const series =
        seriesIndex >= 0
          ? row[seriesIndex] || ""
          : "";

      const combinedText = (
        symbol +
        " " +
        tradingSymbol +
        " " +
        refKey +
        " " +
        combinedSymbol
      ).toUpperCase();

      for (const search of searchSymbols) {

        const exactSymbol =
          symbol.toUpperCase() === search;

        const exactTradingSymbol =
          tradingSymbol.toUpperCase() ===
          search + "-EQ";

        const exactCombinedSymbol =
          combinedSymbol.toUpperCase() === search;

        const containsSearch =
          combinedText.includes(search);

        if (
          exactSymbol ||
          exactTradingSymbol ||
          exactCombinedSymbol ||
          containsSearch
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

            pCombinedSymbol:
              combinedSymbol,

            pContractId:
              contractId,

            pExchSeg:
              exchange,

            pExchange:
              exchangeName,

            pSymbolName:
              symbolName,

            pInstType:
              instrumentType,

            pSeries:
              series,

            // ==================================
            // VALUES TO TEST WITH getQuote
            // ==================================

            neoSymbolCandidates: [

              {
                field:
                  "pSymbol",
                value:
                  symbol
              },

              {
                field:
                  "pTrdSymbol",
                value:
                  tradingSymbol
              },

              {
                field:
                  "pScripRefKey",
                value:
                  refKey
              },

              {
                field:
                  "pCombinedSymbol",
                value:
                  combinedSymbol
              },

              {
                field:
                  "pContractId",
                value:
                  contractId
              }

            ]

          });

          break;
        }
      }
    }

    // ========================================
    // FINAL RESPONSE
    // ========================================

    return res.status(200).json({

      success:
        true,

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

      success:
        false,

      source:
        "KOTAK NEO",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
