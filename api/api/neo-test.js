export default async function handler(req, res) {
  try {
    const accessToken = process.env.NEO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: "NEO_ACCESS_TOKEN is not configured"
      });
    }

    return res.status(200).json({
      success: true,
      project: "Prototype-1",
      neoToken: "CONFIGURED",
      message: "Neo access token is securely available"
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
