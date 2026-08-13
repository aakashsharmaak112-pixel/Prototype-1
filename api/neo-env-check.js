// ============================================
// PROTOTYPE-1
// KOTAK NEO ENVIRONMENT CHECK
// api/neo-env-check.js
// ============================================

export default function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const names = [
    "NEO_ACCESS_TOKEN",
    "NEO_BASE_URL",
    "NEO_MPIN",
    "NEO_MOBILE",
    "NEO_UCC",
    "NEO_VIEW_SID",
    "NEO_VIEW_TOKEN",
    "NEO_TRADE_SID",
    "NEO_TRADE_TOKEN"
  ];

  const result = {};

  for (const name of names) {

    const value = process.env[name];

    if (!value) {
      result[name] = {
        configured: false
      };
      continue;
    }

    const nonAscii = [];

    for (let i = 0; i < value.length; i++) {

      const code = value.charCodeAt(i);

      if (code > 255) {
        nonAscii.push({
          index: i,
          code: code
        });
      }
    }

    result[name] = {
      configured: true,
      length: value.length,
      nonAsciiFound: nonAscii.length > 0,
      nonAscii: nonAscii
    };
  }

  return res.status(200).json({
    success: true,
    project: "Prototype-1",
    purpose: "Kotak Neo environment diagnostic",
    variables: result
  });
}
