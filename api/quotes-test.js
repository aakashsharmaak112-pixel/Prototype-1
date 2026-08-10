export default async function handler(req, res) {
  try {
    const baseUrl = process.env.NEO_BASE_URL;
    const accessToken = process.env.NEO_ACCESS_TOKEN;

    if (!baseUrl || !accessToken) {
      return res.status(500).json({
        success: false,
        error: "NEO_BASE_URL or NEO_ACCESS_TOKEN is not configured"
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

    const batchSize = 10;
    const results = [];
    const errors = [];

    function num(value) {
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    }

    function normalizeQuote(q, fallbackSymbol) {
      if (!q || typeof q !== "object") return null;

      const price = num(
        q.ltp ??
        q.last_price ??
        q.lastPrice ??
        q.lp
      );

      const previousClose = num(
        q.previous_close ??
        q.prev_close ??
        q.previousClose ??
        q.prevClose ??
        q.close_price ??
        q.close
      );

      let rupeeChange = num(
        q.net_change ??
        q.netChange ??
        q.change ??
        q.chg
      );

      let changePercent = num(
        q.percentage_change ??
        q.percent_change ??
        q.percentChange ??
        q.change_percent ??
        q.changePercent ??
        q.pChange
      );

      /*
       * IMPORTANT:
       * If Neo gives previous close,
       * calculate percentage ourselves.
       */

      if (
        previousClose > 0 &&
        price > 0
      ) {
        rupeeChange =
          price - previousClose;

        changePercent =
          (
            (price - previousClose) /
            previousClose
          ) * 100;
      }

      return {
        symbol:
          q.display_symbol ||
          q.symbol ||
          fallbackSymbol,

        exchange_token:
          q.exchange_token ||
          null,

        display_symbol:
          q.display_symbol ||
          null,

        ltp:
          price,

        previous_close:
          previousClose,

        change:
          Number(rupeeChange.toFixed(2)),

        changePercent:
          Number(changePercent.toFixed(2))
      };
    }

    for (
      let i = 0;
      i < stocks.length;
      i += batchSize
    ) {
      const batch =
        stocks.slice(i, i + batchSize);

      const query =
        batch
          .map(
            ([, pSymbol]) =>
              `nse_cm|${pSymbol}`
          )
          .join(",");

      const url =
        `${baseUrl}/script-details/1.0/quotes/neosymbol/${encodeURIComponent(query)}/all`;

      try {
        const response =
          await fetch(url, {
            method: "GET",
            headers: {
              "Content-Type":
                "application/json",
              "Authorization":
                accessToken
            }
          });

        const data =
          await response.json();

        let batchResults = [];

        if (
          response.ok &&
          Array.isArray(data)
        ) {
          batchResults = data;
        }

        else if (
          response.ok &&
          Array.isArray(data?.data)
        ) {
          batchResults = data.data;
        }

        else {
          errors.push({
            batch:
              i / batchSize + 1,

            status:
              response.status,

            response:
              data
          });

          continue;
        }

        batchResults.forEach(
          (quote) => {

            const normalized =
              normalizeQuote(
                quote,
                ""
              );

            if (normalized) {
              results.push(
                normalized
              );
            }

          }
        );

      }

      catch (error) {

        errors.push({
          batch:
            i / batchSize + 1,

          error:
            error.message
        });

      }
    }

    return res.status(200).json({

      success:
        errors.length === 0,

      totalRequested:
        stocks.length,

      totalReceived:
        results.length,

      totalErrors:
        errors.length,

      stocks:
        results,

      errors:
        errors

    });

  }

  catch (error) {

    return res.status(500).json({

      success:
        false,

      error:
        error.message

    });

  }
}
