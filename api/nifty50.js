export default async function handler(req, res) {
  try {
    const accessToken = process.env.NEO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: "NEO_ACCESS_TOKEN is not configured"
      });
    }

    // Nifty 50 symbols
    const nifty50 = [
      "ADANIENT",
      "ADANIPORTS",
      "APOLLOHOSP",
      "ASIANPAINT",
      "AXISBANK",
      "BAJAJ-AUTO",
      "BAJAJFINSV",
      "BAJFINANCE",
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
      "JINDALSTEL",
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
      "ULTRACEMCO",
      "WIPRO"
    ];

    // Get today's Scripmaster file
    const pathResponse = await fetch(
      "https://mis.kotaksecurities.com/script-details/1.0/masterscrip/file-paths",
      {
        method: "GET",
        headers: {
          Authorization: accessToken
        }
      }
    );

    if (!pathResponse.ok) {
      return res.status(pathResponse.status).json({
        success: false,
        error: "Neo Scripmaster API failed"
      });
    }

    const pathData = await pathResponse.json();

    const nseFile = pathData?.data?.filesPaths?.find(
      (url) => url.includes("nse_cm-v1.csv")
    );

    if (!nseFile) {
      return res.status(500).json({
        success: false,
        error: "NSE CM Scripmaster file not found"
      });
    }

    // Download CSV
    const csvResponse = await fetch(nseFile);

    if (!csvResponse.ok) {
      return res.status(csvResponse.status).json({
        success: false,
        error: "Unable to download NSE Scripmaster"
      });
    }

    const csv = await csvResponse.text();

    const lines = csv
      .split(/\r?\n/)
      .filter(Boolean);

    if (lines.length < 2) {
      return res.status(500).json({
        success: false,
        error: "Scripmaster CSV is empty"
      });
    }

    // CSV header
    const headers = lines[0].split(",");

    const pSymbolIndex = headers.indexOf("pSymbol");
    const groupIndex = headers.indexOf("pGroup");
    const exchangeIndex = headers.indexOf("pExchSeg");
    const symbolNameIndex = headers.indexOf("pSymbolName");
    const tradingSymbolIndex = headers.indexOf("pTrdSymbol");

    if (
      pSymbolIndex === -1 ||
      groupIndex === -1 ||
      exchangeIndex === -1 ||
      symbolNameIndex === -1
    ) {
      return res.status(500).json({
        success: false,
        error: "Required Scripmaster columns not found",
        columns: headers
      });
    }

    const stocks = [];
    const seen = new Set();

    // Find unique Nifty 50 EQ stocks
    for (const line of lines.slice(1)) {
      const columns = line.split(",");

      const pSymbol = columns[pSymbolIndex];
      const group = columns[groupIndex];
      const exchange = columns[exchangeIndex];
      const symbolName = columns[symbolNameIndex];
      const tradingSymbol =
        tradingSymbolIndex >= 0
          ? columns[tradingSymbolIndex]
          : "";

      if (
        exchange === "nse_cm" &&
        group === "EQ" &&
        nifty50.includes(symbolName) &&
        !seen.has(symbolName)
      ) {
        seen.add(symbolName);

        stocks.push({
          symbol: symbolName,
          pSymbol: pSymbol,
          tradingSymbol: tradingSymbol
        });
      }
    }

    const missing = nifty50.filter(
      (symbol) => !seen.has(symbol)
    );

    return res.status(200).json({
      success: true,
      source: "Kotak Neo Scripmaster",
      file: nseFile,
      count: stocks.length,
      expected: 50,
      missing: missing,
      stocks: stocks
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
