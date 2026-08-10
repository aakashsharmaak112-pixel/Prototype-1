export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        success: false,
        error: "Use POST method"
      });
    }

    const accessToken = process.env.NEO_ACCESS_TOKEN;
    const mobileNumber = process.env.NEO_MOBILE_NUMBER;
    const ucc = process.env.NEO_UCC;

    if (!accessToken || !mobileNumber || !ucc) {
      return res.status(500).json({
        success: false,
        error: "NEO_ACCESS_TOKEN, NEO_MOBILE_NUMBER or NEO_UCC is missing"
      });
    }

    const { totp } = req.body || {};

    if (!totp || !/^\d{6}$/.test(String(totp))) {
      return res.status(400).json({
        success: false,
        error: "A valid 6-digit TOTP is required"
      });
    }

    const response = await fetch(
      "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin",
      {
        method: "POST",
        headers: {
          "Authorization": accessToken,
          "neo-fin-key": "neotradeapi",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mobileNumber,
          ucc,
          totp: String(totp)
        })
      }
    );

    const data = await response.json();

    return res.status(response.status).json({
      success: response.ok,
      statusCode: response.status,
      neoResponse: data
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
