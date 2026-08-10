export default async function handler(req, res) {
  try {
    const accessToken = process.env.NEO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: "NEO_ACCESS_TOKEN is not configured"
      });
    }

    const response = await fetch(
      "https://mis.kotaksecurities.com/script-details/1.0/masterscrip/file-paths",
      {
        method: "GET",
        headers: {
          Authorization: accessToken
        }
      }
    );

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
