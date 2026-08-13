// ============================================
// PROTOTYPE-1
// KOTAK NEO TOTP LOGIN TEST
// api/neo-login-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Use POST method."
    });
  }

  const ACCESS_TOKEN =
    process.env.NEO_ACCESS_TOKEN;

  const MOBILE =
    process.env.NEO_MOBILE;

  const UCC =
    process.env.NEO_UCC;

  const TOTP =
    req.body?.totp;

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

  if (!/^\d{6}$/.test(String(TOTP || ""))) {
    return res.status(400).json({
      success: false,
      error: "Enter the current 6-digit TOTP."
    });
  }

  // ------------------------------------------
  // MOBILE FORMAT
  // Kotak Neo expects country code
  // Example: +919876543210
  // ------------------------------------------

  const cleanMobile =
    String(MOBILE)
      .trim()
      .replace(/[\s-]/g, "");

  let mobileNumber = cleanMobile;

  if (/^\d{10}$/.test(cleanMobile)) {
    mobileNumber = "+91" + cleanMobile;
  }

  if (!/^\+91\d{10}$/.test(mobileNumber)) {
    return res.status(400).json({
      success: false,
      error:
        "NEO_MOBILE must be a valid Indian mobile number. Use +91 followed by 10 digits."
    });
  }

  // ------------------------------------------
  // KOTAK NEO TOTP LOGIN
  // ------------------------------------------

  const loginUrl =
    "https://mis.kotaksecurities.com/login/1.0/tradeApiLogin";

  try {

    const response = await fetch(
      loginUrl,
      {
        method: "POST",

        headers: {
          "Authorization": String(ACCESS_TOKEN).trim(),
          "neo-fin-key": "neotradeapi",
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify({
          mobileNumber: mobileNumber,
          ucc: String(UCC).trim(),
          totp: String(TOTP)
        })
      }
    );

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
        error: "Kotak returned non-JSON response."
      });

    }

    const obj =
      data?.data || data;

    const sid =
      obj?.sid ||
      obj?.Sid ||
      obj?.viewSid ||
      null;

    const token =
      obj?.token ||
      obj?.viewToken ||
      obj?.Auth ||
      obj?.auth ||
      null;

    const baseUrl =
      obj?.baseUrl ||
      obj?.base_url ||
      null;

    return res.status(response.status).json({

      success: response.ok,

      source:
        "KOTAK NEO V2",

      step:
        "TOTP LOGIN",

      kotakHttpStatus:
        response.status,

      mobileFormat:
        "+91XXXXXXXXXX",

      sidFound:
        Boolean(sid),

      tokenFound:
        Boolean(token),

      baseUrlFound:
        Boolean(baseUrl),

      sidLength:
        sid ? String(sid).length : 0,

      tokenLength:
        token ? String(token).length : 0,

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

      source:
        "KOTAK NEO V2",

      error:
        error.message ||
        "Unexpected server error."

    });

  }
}
