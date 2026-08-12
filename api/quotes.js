// ============================================
// PROTOTYPE-1
// KOTAK NEO LIVE QUOTES API
// api/quotes.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const ACCESS_TOKEN = process.env.NEO_ACCESS_TOKEN;
  const BASE_URL = process.env.NEO_BASE_URL;

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN is not configured."
    });
  }

  if (!BASE_URL) {
    return res.status(500).json({
      success: false,
      error: "NEO_BASE_URL is not configured."
    });
  }

  const stocks = [
    { symbol: "MARUTI", token: "10999" },
    { symbol: "ULTRACEMCO", token: "11532" },
    { symbol: "TCS", token: "11536" },
    { symbol: "GRASIM", token: "1232" },
    { symbol: "JSWSTEEL", token: "11723" },
    { symbol: "LT", token: "11483" },
    { symbol: "BHARTIARTL", token: "10604" },
    { symbol: "HEROMOTOCO", token: "1348" },
    { symbol: "NTPC", token: "11630" },
    { symbol: "HINDALCO", token: "1363" },
    { symbol: "HINDUNILVR", token: "1394" },
    { symbol: "HDFCBANK", token: "1333" },
    { symbol: "TECHM", token: "13538" },
    { symbol: "BAJAJFINSV", token: "16675" },
    { symbol: "TITAN", token: "3506" },
    { symbol: "RELIANCE", token: "2885" },
    { symbol: "SBIN", token: "3045" },
    { symbol: "ONGC", token: "2475" },
    { symbol: "MAXHEALTH", token: "22377" },
    { symbol: "TRENT", token: "1964" },
    { symbol: "COALINDIA", token: "20374" },
    { symbol: "NESTLEIND", token: "17963" },
    { symbol: "APOLLOHOSP", token: "157" },
    { symbol: "ADANIPORTS", token: "15083" },
    { symbol: "POWERGRID", token: "14977" },
    { symbol: "ASIANPAINT", token: "236" },
    { symbol: "INFY", token: "1594" },
    { symbol: "M&M", token: "2031" },
    { symbol: "KOTAKBANK", token: "1922" },
    { symbol: "ADANIENT", token: "25" },
    { symbol: "ITC", token: "1660" },
    { symbol: "TATACONSUM", token: "3432" },
    { symbol: "BAJAJ-AUTO", token: "16669" },
    { symbol: "SBILIFE", token: "21808" },
    { symbol: "SUNPHARMA", token: "3351" },
    { symbol: "TATASTEEL", token: "3499" },
    { symbol: "BAJFINANCE", token: "317" },
    { symbol: "SHRIRAMFIN", token: "4306" },
    { symbol: "BEL", token: "383" },
    { symbol: "ICICIBANK", token: "4963" },
    { symbol: "HDFCLIFE", token: "467" },
    { symbol: "WIPRO", token: "3787" },
    { symbol: "INDUSINDBK", token: "5258" },
    { symbol: "ETERNAL", token: "5097" },
    { symbol: "AXISBANK", token: "5900" },
    { symbol: "HCLTECH", token: "7229" },
    { symbol: "JINDALSTEL", token: "6733" },
    { symbol: "CIPLA", token: "694" },
    { symbol: "EICHERMOT", token: "910" },
    { symbol: "DRREDDY", token: "881" }
  ];

  const instrumentTokens = stocks.map(function(stock) {
    return {
      instrument_token: stock.token,
      exchange_segment: "nse_cm"
    };
  });

  const quoteUrl =
    BASE_URL.replace(/\/+$/, "") +
    "/script-details/1.0/quotes";

  const headers = {
    "Authorization": ACCESS_TOKEN,
    "Content-Type": "application/json",
    "Accept": "application/json"
  };

  try {

    const response = await fetch(
      quoteUrl,
      {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          instrument_tokens: instrumentTokens,
          quote_type: "all"
        })
      }
    );

    const rawText = await response.text();

    console.log(
      "Kotak Neo Quotes HTTP status:",
      response.status
    );

    let data = null;

    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch (parseError) {

      return res.status(502).json({
        success: false,
        source: "KOTAK NEO",
        error: "Kotak Neo returned a non-JSON response.",
        status: response.status,
        rawResponse: rawText.substring(0, 500)
      });

    }

    if (!response.ok) {

      return res.status(response.status).json({
        success: false,
        source: "KOTAK NEO",
        error: "Kotak Neo Quotes API request failed.",
        status: response.status,
        kotakResponse: data
      });

    }

    let quotes = [];

    if (Array.isArray(data)) {
      quotes = data;
    } else if (data && Array.isArray(data.quotes)) {
      quotes = data.quotes;
    } else if (data && Array.isArray(data.data)) {
      quotes = data.data;
    } else if (data && Array.isArray(data.result)) {
      quotes = data.result;
    } else if (data && Array.isArray(data.results)) {
      quotes = data.results;
    }

    const stockMap = {};

    stocks.forEach(function(stock) {
      stockMap[stock.token] = stock;
    });

    const normalizedQuotes = [];
    const errors = [];

    quotes.forEach(function(quote) {

      if (!quote || typeof quote !== "object") {
        return;
      }

      const token = String(
        quote.instrument_token ??
        quote.instrumentToken ??
        quote.token ??
        ""
      );

      const stock = stockMap[token];

      const symbol = stock
        ? stock.symbol
        : (
            quote.symbol ||
            quote.display_symbol ||
            ""
          );

      const displaySymbol = stock
        ? stock.symbol + "-EQ"
        : (
            quote.display_symbol ||
            (symbol ? symbol + "-EQ" : "")
          );

      const ltp =
        quote.ltp ??
        quote.last_traded_price ??
        quote.lastTradedPrice ??
        quote.last_price ??
        quote.lastPrice ??
        quote.LTP ??
        null;

      const previousClose =
        quote.previous_close ??
        quote.previousClose ??
        quote.prev_close ??
        quote.prevClose ??
        quote.close_price ??
        quote.close ??
        null;

      let percentageChange =
        quote.percentage_change ??
        quote.percentageChange ??
        quote.percent_change ??
        quote.percentChange ??
        quote.pChange ??
        null;

      let netChange =
        quote.net_change ??
        quote.netChange ??
        quote.change ??
        quote.chg ??
        null;

      const priceNumber = Number(ltp);
      const previousNumber = Number(previousClose);

      if (
        Number.isFinite(priceNumber) &&
        Number.isFinite(previousNumber) &&
        previousNumber > 0
      ) {

        netChange =
          priceNumber -
          previousNumber;

        percentageChange =
          (netChange / previousNumber) * 100;

      }

      normalizedQuotes.push({
        display_symbol: displaySymbol,
        symbol: symbol,
        exchange: quote.exchange || "nse_cm",
        instrument_token: token,

        ltp: Number.isFinite(priceNumber)
          ? priceNumber
          : null,

        previous_close: Number.isFinite(previousNumber)
          ? previousNumber
          : null,

        percentage_change:
          Number.isFinite(Number(percentageChange))
            ? Number(Number(percentageChange).toFixed(2))
            : null,

        net_change:
          Number.isFinite(Number(netChange))
            ? Number(Number(netChange).toFixed(2))
            : null
      });

    });

    const totalReceived = normalizedQuotes.length;
    const totalRequested = stocks.length;
    const totalErrors = totalRequested - totalReceived;

    return res.status(200).json({

      success: true,

      source: "KOTAK NEO",

      marketData: "LIVE",

      totalRequested: totalRequested,

      totalReceived: totalReceived,

      totalErrors: totalErrors,

      quotes: normalizedQuotes,

      errors: errors

    });

  } catch (error) {

    console.error(
      "Kotak Neo Quotes Error:",
      error
    );

    return res.status(500).json({

      success: false,

      source: "KOTAK NEO",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
