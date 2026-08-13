// ============================================
// PROTOTYPE-1
// KOTAK NEO LOGIN RESPONSE CHECK
// api/neo-test.js
// ============================================

export default async function handler(req, res) {

  if (req.method !== "GET") {
    return res.status(405).json({
      success: false,
      error: "Only GET method is allowed."
    });
  }

  const ACCESS_TOKEN = process.env.NEO_ACCESS_TOKEN;
  const UCC = process.env.NEO_UCC;
  const MOBILE = process.env.NEO_MOBILE;

  if (!ACCESS_TOKEN || !UCC || !MOBILE) {
    return res.status(500).json({
      success: false,
      error: "NEO_ACCESS_TOKEN, NEO_UCC and NEO_MOBILE are required."
    });
  }

  return res.status(200).json({
    success: true,
    message: "Ready for exact Kotak TOTP login step.",
    nextStep: "tradeApiLogin"
  });
}
