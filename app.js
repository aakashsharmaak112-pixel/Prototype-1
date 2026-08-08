// ============================================
// AI STOCK ASSISTANT - NIFTY 50 DATA ENGINE
// Step 1: Nifty 50 Stock List
// ============================================

const NIFTY_50_STOCKS = [
  { symbol: "HDFCBANK", name: "HDFC Bank", sector: "Financial Services" },
  { symbol: "ICICIBANK", name: "ICICI Bank", sector: "Financial Services" },
  { symbol: "RELIANCE", name: "Reliance Industries", sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "BHARTIARTL", name: "Bharti Airtel", sector: "Telecommunication" },
  { symbol: "LT", name: "Larsen & Toubro", sector: "Construction" },
  { symbol: "SBIN", name: "State Bank of India", sector: "Financial Services" },
  { symbol: "INFY", name: "Infosys", sector: "Information Technology" },
  { symbol: "AXISBANK", name: "Axis Bank", sector: "Financial Services" },
  { symbol: "BAJFINANCE", name: "Bajaj Finance", sector: "Financial Services" },
  { symbol: "M&M", name: "Mahindra & Mahindra", sector: "Automobile" },

  { symbol: "ADANIENT", name: "Adani Enterprises", sector: "Metals & Mining" },
  { symbol: "ADANIPORTS", name: "Adani Ports", sector: "Services" },
  { symbol: "APOLLOHOSP", name: "Apollo Hospitals", sector: "Healthcare" },
  { symbol: "ASIANPAINT", name: "Asian Paints", sector: "Consumer Durables" },
  { symbol: "BAJAJ-AUTO", name: "Bajaj Auto", sector: "Automobile" },
  { symbol: "BAJAJFINSV", name: "Bajaj Finserv", sector: "Financial Services" },
  { symbol: "BEL", name: "Bharat Electronics", sector: "Capital Goods" },
  { symbol: "CIPLA", name: "Cipla", sector: "Healthcare" },
  { symbol: "COALINDIA", name: "Coal India", sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "DRREDDY", name: "Dr. Reddy's Laboratories", sector: "Healthcare" },

  { symbol: "EICHERMOT", name: "Eicher Motors", sector: "Automobile" },
  { symbol: "ETERNAL", name: "Eternal", sector: "Consumer Services" },
  { symbol: "GRASIM", name: "Grasim Industries", sector: "Construction Materials" },
  { symbol: "HCLTECH", name: "HCL Technologies", sector: "Information Technology" },
  { symbol: "HDFCLIFE", name: "HDFC Life Insurance", sector: "Financial Services" },
  { symbol: "HINDALCO", name: "Hindalco Industries", sector: "Metals & Mining" },
  { symbol: "HINDUNILVR", name: "Hindustan Unilever", sector: "FMCG" },
  { symbol: "ITC", name: "ITC", sector: "FMCG" },
  { symbol: "INDIGO", name: "InterGlobe Aviation", sector: "Services" },
  { symbol: "JSWSTEEL", name: "JSW Steel", sector: "Metals & Mining" },

  { symbol: "JIOFIN", name: "Jio Financial Services", sector: "Financial Services" },
  { symbol: "KOTAKBANK", name: "Kotak Mahindra Bank", sector: "Financial Services" },
  { symbol: "MARUTI", name: "Maruti Suzuki", sector: "Automobile" },
  { symbol: "MAXHEALTH", name: "Max Healthcare", sector: "Healthcare" },
  { symbol: "NTPC", name: "NTPC", sector: "Power" },
  { symbol: "NESTLEIND", name: "Nestle India", sector: "FMCG" },
  { symbol: "ONGC", name: "ONGC", sector: "Oil, Gas & Consumable Fuels" },
  { symbol: "POWERGRID", name: "Power Grid", sector: "Power
    
