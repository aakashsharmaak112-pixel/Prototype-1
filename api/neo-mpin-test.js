// ============================================
// PROTOTYPE-1
// KOTAK NEO MPIN VALIDATION
// api/neo-mpin-test.js
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

  const MPIN =
    process.env.NEO_MPIN;

  const SID =
    process.env.NEO_VIEW_SID;

  const AUTH =
    process.env.NEO_VIEW_TOKEN;

  if (!ACCESS_TOKEN) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN missing."
    });
  }

  if (!MPIN) {
    return res.status(500).json({
      success: false,
      error: "NEO_MPIN missing."
    });
  }

  if (!SID) {
    return res.status(500).json({
      success: false,
      error: "NEO_VIEW_SID missing."
    });
  }

  if (!AUTH) {
    return res.status(500).json({
      success: false,
      error: "NEO_VIEW_TOKEN missing."
    });
  }

  if (!/^\d{6}$/.test(String(MPIN).trim())) {
    return res.status(400).json({
      success: false,
      error: "NEO_MPIN must be exactly 6 digits."
    });
  }

  const validateUrl =
    "https://mis.kotaksecurities.com/login/1.0/tradeApiValidate";

  try {

    const response = await fetch(
      validateUrl,
      {
        method: "POST",

        headers: {
          "Authorization": String(ACCESS_TOKEN).trim(),
          "neo-fin-key": "neotradeapi",
          "Sid": String(SID).trim(),
          "Auth": String(AUTH).trim(),
          "Content-Type": "application/json",
          "Accept": "application/json"
        },

        body: JSON.stringify({
          mpin: String(MPIN).trim()
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
        step: "MPIN VALIDATION",
        kotakHttpStatus: response.status,
        error: "Kotak returned non-JSON response."
      });

    }

    const obj =
      data?.data || data;

    const baseUrl =
      obj?.baseUrl ||
      obj?.base_url ||
      data?.baseUrl ||
      data?.base_url ||
      null;

    const tradeSid =
      obj?.sid ||
      obj?.Sid ||
      null;

    const tradeToken =
      obj?.token ||
      obj?.Auth ||
      obj?.auth ||
      null;

    return res.status(response.status).json({

      success: response.ok,

      source:
        "KOTAK NEO V2",

      step:
        "MPIN VALIDATION",

      kotakHttpStatus:
        response.status,

      baseUrlFound:
        Boolean(baseUrl),

      tradeSidFound:
        Boolean(tradeSid),

      tradeTokenFound:
        Boolean(tradeToken),

      baseUrl:
        baseUrl || null,

      tradeSidLength:
        tradeSid
          ? String(tradeSid).length
          : 0,

      tradeTokenLength:
        tradeToken
          ? String(tradeToken).length
          : 0,

      message:
        response.ok
          ? "MPIN validation successful."
          : "MPIN validation failed.",

      kotakResponse:
        data

    });

  } catch (error) {

    return res.status(500).json({

      success: false,

      source:
        "KOTAK NEO V2",

      step:
        "MPIN VALIDATION",

      error:
        error.message ||
        "Unexpected server error."

    });

  }

}
