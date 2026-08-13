// ============================================
// PROTOTYPE-1
// KOTAK NEO V2 - TOTP LOGIN
// api/neo-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const ACCESS_TOKEN =
    process.env.NEO_ACCESS_TOKEN;

  const MOBILE =
    process.env.NEO_MOBILE;

  const UCC =
    process.env.NEO_UCC;

  const TOTP =
    process.env.NEO_TOTP;

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN missing."
    });
  }

  if (!MOBILE) {
    return res.status(500).json({
      success: false,
      error: "NEO_MOBILE missing."
    });
  }

  if (!UCC) {
    return res.status(500).json({
      success: false,
      error: "NEO_UCC missing."
    });
  }

  if (!TOTP) {
    return res.status(500).json({
      success: false,
      error: "NEO_TOTP missing."
    });
  }

  const loginUrl =
    "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

  try {

    const response = await fetch(loginUrl, {

      method: "POST",

      headers: {
        "Authorization": ACCESS_TOKEN,
        "neo-fin-key": "neotradeapi",
        "Content-Type": "application/json",
        "Accept": "application/json"
      },

      body: JSON.stringify({
        mobileNumber: MOBILE,
        ucc: UCC,
        totp: TOTP
      })

    });

    const rawText =
      await response.text();

    let data = null;

    try {
      data = rawText
        ? JSON.parse(rawText)
        : null;
    } catch (error) {

      return res.status(502).json({
        success: false,
        source: "KOTAK NEO V2",
        step: "TOTP LOGIN",
        kotakHttpStatus: response.status,
        error: "Kotak returned non-JSON response.",
        rawResponse: rawText.slice(0, 1000)
      });

    }

    const obj =
      data?.data || data;

    const sid =
      obj?.sid ||
      obj?.Sid ||
      obj?.viewSid ||
      null;

    const auth =
      obj?.token ||
      obj?.Auth ||
      obj?.auth ||
      obj?.viewToken ||
      null;

    return res.status(response.status).json({

      success: response.ok,

      source: "KOTAK NEO V2",

      step: "TOTP LOGIN",

      kotakHttpStatus:
        response.status,

      sidFound:
        Boolean(sid),

      authFound:
        Boolean(auth),

      sidLength:
        sid ? String(sid).length : 0,

      authLength:
        auth ? String(auth).length : 0,

      message:
        response.ok
          ? "TOTP login successful."
          : "TOTP login failed.",

      kotakResponse:
        data

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      source: "KOTAK NEO V2",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
