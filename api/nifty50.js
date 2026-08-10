export default async function handler(req, res) {
  try {
    const accessToken = process.env.NEO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: "NEO_ACCESS_TOKEN is not configured"
      });
    }

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

    const pathResponse = await fetch(
      "https://mis.kotaksecurities.com/script-details/1.0/masterscrip/file-paths",
      {
        headers: {
          Authorization: accessToken
        }
      }
    );

    const pathData = await pathResponse.json();

    const nseFile = pathData?.data?.filesPaths?.find(
      url => url.includes("nse_cm-v1.csv")
    );

    if (!nseFile) {
      throw new Error("NSE Scripmaster file not found");
    }

    const csvResponse = await fetch(nseFile);
    const csv = await csvResponse.text();

    const lines = csv.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(",");

    const pSymbolIndex = headers.indexOf("pSymbol");
    const pSymbolNameIndex = headers.indexOf("pSymbolName");
    const exchangeIndex = headers.indexOf("pExchSeg");

    const result = [];

    for (const line of lines.slice(1)) {
      const columns = line.split(",");

      const tradingSymbol = columns[pSymbolNameIndex];

      if (
        columns[exchangeIndex] === "nse_cm" &&
        nifty50.includes(tradingSymbol)
      ) {
        result.push({
          symbol: tradingSymbol,
          pSymbol: columns[pSymbolIndex]
        });
      }
    }

    return res.status(200).json({
      success: true,
      count: result.length,
      missing: nifty50.filter(
        symbol => !result.some(item => item.symbol === symbol)
      ),
      stocks: result
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
