export default async function handler(req, res) {
  try {
    const baseUrl = process.env.NEO_BASE_URL;
    const accessToken = process.env.NEO_ACCESS_TOKEN;
    const viewSid = process.env.NEO_VIEW_SID;
    const viewToken = process.env.NEO_VIEW_TOKEN;

    if (!baseUrl || !accessToken || !viewSid || !viewToken) {
      return res.status(500).json({
        success: false,
        error: "Required Kotak Neo environment variables are missing"
      });
    }

    // HDFCBANK pSymbol from NSE scripmaster
    const neoSymbol = "nse_cm|1333";

    const url =
      `${baseUrl}/script-details/1.0/quotes/neosymbol/${encodeURIComponent(neoSymbol)}/all`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": accessToken,
        "neo-fin-key": "neotradeapi",
        "sid": viewSid,
        "Auth": viewToken
      }
    });

    const data = await response.json();

    return res.status(response.status).json({
      success: response.ok,
      neoResponse: data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
