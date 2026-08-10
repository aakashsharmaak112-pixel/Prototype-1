export default async function handler(req, res) {
  try {
    const accessToken = process.env.NEO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: "NEO_ACCESS_TOKEN is not configured"
      });
    }

    // Get today's Scripmaster file paths from Neo
    const pathResponse = await fetch(
      "https://mis.kotaksecurities.com/script-details/1.0/masterscrip/file-paths",
      {
        headers: {
          Authorization: accessToken
        }
      }
    );

    if (!pathResponse.ok) {
      return res.status(pathResponse.status).json({
        success: false,
        error: "Neo Scripmaster API failed"
      });
    }

    const pathData = await pathResponse.json();

    const files = pathData?.data?.filesPaths || [];

    const nseFile = files.find(
      (url) => url.includes("nse_cm-v1.csv")
    );

    if (!nseFile) {
      return res.status(500).json({
        success: false,
        error: "NSE CM scripmaster file not found"
      });
    }

    // Download NSE Cash Scripmaster
    const csvResponse = await fetch(nseFile);

    if (!csvResponse.ok) {
      return res.status(csvResponse.status).json({
        success: false,
        error: "Unable to download NSE scripmaster"
      });
    }

    const csvText = await csvResponse.text();

    // Return only basic information for the first test.
    const lines = csvText.split(/\r?\n/).filter(Boolean);

    return res.status(200).json({
      success: true,
      project: "Prototype-1",
      source: "Kotak Neo Scripmaster",
      file: nseFile,
      totalRows: lines.length,
      firstRows: lines.slice(0, 3)
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
