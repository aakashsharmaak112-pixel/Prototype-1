export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${process.env.NEO_AUTH_TOKEN}`,
          "X-PrivateKey": process.env.NEO_API_KEY,
          "X-UserType": "USER",
          "X-SourceID": "WEB"
        },
        body: JSON.stringify({
          mode: "LTP",
          exchangeTokens: {
            NSE: ["1333"]
          }
        })
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
