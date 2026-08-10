export default async function handler(req, res) {
  try {
    const accessToken = process.env.NEO_ACCESS_TOKEN;

    if (!accessToken) {
      return res.status(500).json({
        success: false,
        error: "NEO_ACCESS_TOKEN is not configured"
      });
    }

    // Today's Kotak Neo Scripmaster
    const pathResponse = await fetch(
      "https://mis.kotaksecurities.com/script-details/1.0/masterscrip/file-paths",
      {
        headers: {
          Authorization: accessToken
        }
      }
    );

    const pathData = await pathResponse.json();

    const nseFile = pathData?.data?.filesPaths?.find(
      url => url.includes("nse_cm-v1.csv")
    );

    if (!nseFile) {
      return res.status(500).json({
        success: false,
        error: "NSE CM scripmaster not found"
      });
    }

    const csvResponse = await fetch(nseFile);
    const csv = await csvResponse.text();

    const lines = csv.split(/\r?\n/).filter(Boolean);

    const headers = lines[0].split(",");

    const symbolIndex = headers.indexOf("pSymbol");
    const nameIndex = headers.indexOf("pSymbolName");
    const exchangeIndex = headers.indexOf("pExchSeg");

    return res.status(200).json({
      success: true,
      source: "Kotak Neo Scripmaster",
      totalRows: lines.length - 1,
      columns: {
        pSymbol: symbolIndex,
        pSymbolName: nameIndex,
        pExchSeg: exchangeIndex
      },
      sample: lines.slice(1, 6)
    });

  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}
