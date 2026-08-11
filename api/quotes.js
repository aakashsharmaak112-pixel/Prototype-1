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
      ["MARUTI", "MARUTI-EQ", "10999"],
      ["ULTRACEMCO", "ULTRACEMCO-EQ", "11532"],
      ["TCS", "TCS-EQ", "11536"],
      ["GRASIM", "GRASIM-EQ", "1232"],
      ["JSWSTEEL", "JSWSTEEL-EQ", "11723"],
      ["LT", "LT-EQ", "11483"],
      ["BHARTIARTL", "BHARTIARTL-EQ", "10604"],
      ["HEROMOTOCO", "HEROMOTOCO-EQ", "1348"],
      ["NTPC", "NTPC-EQ", "11630"],
      ["HINDALCO", "HINDALCO-EQ", "1363"],
      ["HINDUNILVR", "HINDUNILVR-EQ", "1394"],
      ["HDFCBANK", "HDFCBANK-EQ", "1333"],
      ["TECHM", "TECHM-EQ", "13538"],
      ["BAJAJFINSV", "BAJAJFINSV-EQ", "16675"],
      ["TITAN", "TITAN-EQ", "3506"],
      ["RELIANCE", "RELIANCE-EQ", "2885"],
      ["SBIN", "SBIN-EQ", "3045"],
      ["ONGC", "ONGC-EQ", "2475"],
      ["MAXHEALTH", "MAXHEALTH-EQ", "22377"],
      ["TRENT", "TRENT-EQ", "1964"],
      ["COALINDIA", "COALINDIA-EQ", "20374"],
      ["NESTLEIND", "NESTLEIND-EQ", "17963"],
      ["APOLLOHOSP", "APOLLOHOSP-EQ", "157"],
      ["ADANIPORTS", "ADANIPORTS-EQ", "15083"],
      ["POWERGRID", "POWERGRID-EQ", "14977"],
      ["ASIANPAINT", "ASIANPAINT-EQ", "236"],
      ["INFY", "INFY-EQ", "1594"],
      ["M&M", "M&M-EQ", "2031"],
      ["KOTAKBANK", "KOTAKBANK-EQ", "1922"],
      ["ADANIENT", "ADANIENT-EQ", "25"],
      ["ITC", "ITC-EQ", "1660"],
      ["TATACONSUM", "TATACONSUM-EQ", "3432"],
      ["BAJAJ-AUTO", "BAJAJ-AUTO-EQ", "16669"],
      ["SBILIFE", "SBILIFE-EQ", "21808"],
      ["SUNPHARMA", "SUNPHARMA-EQ", "3351"],
      ["TATASTEEL", "TATASTEEL-EQ", "3499"],
      ["BAJFINANCE", "BAJFINANCE-EQ", "317"],
      ["SHRIRAMFIN", "SHRIRAMFIN-EQ", "4306"],
      ["BEL", "BEL-EQ", "383"],
      ["ICICIBANK", "ICICIBANK-EQ", "4963"],
      ["HDFCLIFE", "HDFCLIFE-EQ", "467"],
      ["WIPRO", "WIPRO-EQ", "3787"],
      ["INDUSINDBK", "INDUSINDBK-EQ", "5258"],
      ["ETERNAL", "ETERNAL-EQ", "5097"],
      ["AXISBANK", "AXISBANK-EQ", "5900"],
      ["HCLTECH", "HCLTECH-EQ", "7229"],
      ["JINDALSTEL", "JINDALSTEL-EQ", "6733"],
      ["CIPLA", "CIPLA-EQ", "694"],
      ["EICHERMOT", "EICHERMOT-EQ", "910"],
      ["DRREDDY", "DRREDDY-EQ", "881"]
    ];

    const exchange = "nse_cm";

    const results = [];
    const errors = [];

    for (const [symbol, neoSymbol, token] of stocks) {
      try {
        const url =
          `${baseUrl.replace(/\/$/, "")}/quote` +
          `?exchange_segment=${encodeURIComponent(exchange)}` +
          `&neo_symbol=${encodeURIComponent(neoSymbol)}`;

        const response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${accessToken}`
          }
        });

        const rawText = await response.text();

        let data;

        try {
          data = JSON.parse(rawText);
        } catch (parseError) {
          errors.push({
            symbol,
            token,
            neoSymbol,
            status: response.status,
            error: parseError.message,
            rawResponse: rawText.substring(0, 500)
          });

          continue;
        }

        if (!response.ok) {
          errors.push({
            symbol,
            token,
            neoSymbol,
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

        results.push({
          display_symbol: `${symbol}-EQ`,
          symbol,
          exchange,
          instrument_token: token,
          neo_symbol: neoSymbol,

          ltp:
            quote?.ltp ??
            quote?.last_price ??
            quote?.lastPrice ??
            quote?.LTP ??
            null,

          previous_close:
            quote?.previous_close ??
            quote?.prev_close ??
            quote?.prevClose ??
            quote?.previousClose ??
            null,

          percentage_change:
            quote?.percentage_change ??
            quote?.percent_change ??
            quote?.pChange ??
            quote?.percentageChange ??
            null,

          net_change:
            quote?.net_change ??
            quote?.netChange ??
            quote?.change ??
            quote?.chg ??
            null
        });

      } catch (error) {
        errors.push({
          symbol,
          token,
          neoSymbol,
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
