export default async function handler(req, res) {
  try {
    const baseUrl = process.env.NEO_BASE_URL;
    const accessToken = process.env.NEO_ACCESS_TOKEN;

    if (!baseUrl || !accessToken) {
      return res.status(500).json({
        success: false,
        error: "NEO_BASE_URL or NEO_ACCESS_TOKEN not configured"
      });
    }

    const stocks = [
      ["MARUTI", "10999"],
      ["ULTRACEMCO", "11532"],
      ["TCS", "11536"],
      ["GRASIM", "1232"],
      ["JSWSTEEL", "11723"],
      ["LT", "11483"],
      ["BHARTIARTL", "10604"],
      ["HEROMOTOCO", "1348"],
      ["NTPC", "11630"],
      ["HINDALCO", "1363"],
      ["HINDUNILVR", "1394"],
      ["HDFCBANK", "1333"],
      ["TECHM", "13538"],
      ["BAJAJFINSV", "16675"],
      ["TITAN", "3506"],
      ["RELIANCE", "2885"],
      ["SBIN", "3045"],
      ["ONGC", "2475"],
      ["MAXHEALTH", "22377"],
      ["TRENT", "1964"],
      ["COALINDIA", "20374"],
      ["NESTLEIND", "17963"],
      ["APOLLOHOSP", "157"],
      ["ADANIPORTS", "15083"],
      ["POWERGRID", "14977"],
      ["ASIANPAINT", "236"],
      ["INFY", "1594"],
      ["M&M", "2031"],
      ["KOTAKBANK", "1922"],
      ["ADANIENT", "25"],
      ["ITC", "1660"],
      ["TATACONSUM", "3432"],
      ["BAJAJ-AUTO", "16669"],
      ["SBILIFE", "21808"],
      ["SUNPHARMA", "3351"],
      ["TATASTEEL", "3499"],
      ["BAJFINANCE", "317"],
      ["SHRIRAMFIN", "4306"],
      ["BEL", "383"],
      ["ICICIBANK", "4963"],
      ["HDFCLIFE", "467"],
      ["WIPRO", "3787"],
      ["INDUSINDBK", "5258"],
      ["ETERNAL", "5097"],
      ["AXISBANK", "5900"],
      ["HCLTECH", "7229"],
      ["JINDALSTEL", "6733"],
      ["CIPLA", "694"],
      ["EICHERMOT", "910"],
      ["DRREDDY", "881"]
    ];

    const exchange = "nse_cm";
    const results = [];
    const errors = [];

    for (const [symbol, token] of stocks) {
      try {
        const neoSymbol = `${symbol}-EQ`;

        const url =
          `${baseUrl.replace(/\/$/, "")}` +
          `/script-details/1.0/quotes/neosymbol/` +
          `${encodeURIComponent(neoSymbol)}/all`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: accessToken
          }
        });

        const rawText = await response.text();

        let data;

        try {
          data = JSON.parse(rawText);
        } catch (parseError) {
          errors.push({
            symbol,
            status: response.status,
            error: parseError.message,
            rawResponse: rawText.substring(0, 300)
          });
          continue;
        }

        if (!response.ok) {
          errors.push({
            symbol,
            status: response.status,
            response: data
          });
          continue;
        }

        const quote =
          data?.data ||
          data?.result ||
          data?.quote ||
          data;

        const actualQuote =
          Array.isArray(quote) ? quote[0] : quote;

        results.push({
          display_symbol: `${symbol}-EQ`,
          symbol,
          exchange,
          instrument_token: token,

          ltp:
            actualQuote?.ltp ??
            actualQuote?.last_price ??
            actualQuote?.lastPrice ??
            null,

          previous_close:
            actualQuote?.previous_close ??
            actualQuote?.prev_close ??
            actualQuote?.prevClose ??
            null,

          percentage_change:
            actualQuote?.percentage_change ??
            actualQuote?.percent_change ??
            actualQuote?.pChange ??
            null,

          net_change:
            actualQuote?.net_change ??
            actualQuote?.change ??
            actualQuote?.chg ??
            null
        });

      } catch (error) {
        errors.push({
          symbol,
          error: error.message
        });
      }
    }

    return res.status(200).json({
      success: true,
      source: "KOTAK NEO",
      marketData: "LIVE",
      totalRequested: stocks.length,
      totalReceived: results.length,
      totalErrors: errors.length,
      quotes: results,
      errors
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
