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

    // HDFCBANK from Kotak Neo NSE scripmaster
    // pSymbol = 1333
    const neoSymbol = "nse_cm|1333";

    const url =
      `${baseUrl}/script-details/1.0/quotes/neosymbol/${encodeURIComponent(neoSymbol)}/all`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": accessToken
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
