// ============================================
// PROTOTYPE-1
// SECURE BACKEND PROTOTYPE
// ============================================

// Backend status
const BACKEND_STATUS = {
  name: "Prototype-1 Backend",
  status: "READY",
  broker: "NOT_CONNECTED",
  marketData: "TEST"
};


// --------------------------------------------
// Health check
// --------------------------------------------

function healthCheck() {

  return {
    success: true,
    backend: BACKEND_STATUS.name,
    status: BACKEND_STATUS.status,
    broker: BACKEND_STATUS.broker,
    marketData: BACKEND_STATUS.marketData,
    time: new Date().toISOString()
  };

}


// --------------------------------------------
// Market data endpoint prototype
// --------------------------------------------

function getMarketData() {

  return {
    success: true,

    source: "TEST",

    timestamp:
      new Date().toISOString(),

    stocks: {

      HDFCBANK: {
        price: 1000,
        change: 2.5
      },

      RELIANCE: {
        price: 1400,
        change: 1.8
      },

      ICICIBANK: {
        price: 1200,
        change: 3.2
      },

      INFY: {
        price: 1600,
        change: -0.8
      },

      SBIN: {
        price: 800,
        change: 2.1
      }

    }

  };

}


// --------------------------------------------
// Backend information
// --------------------------------------------

function getBackendStatus() {

  return {
    backend:
      BACKEND_STATUS.name,

    status:
      BACKEND_STATUS.status,

    broker:
      BACKEND_STATUS.broker,

    marketData:
      BACKEND_STATUS.marketData
  };

}


// --------------------------------------------
// Browser / test access
// --------------------------------------------

if (typeof window !== "undefined") {

  window.healthCheck =
    healthCheck;

  window.getMarketData =
    getMarketData;

  window.getBackendStatus =
    getBackendStatus;

}


// --------------------------------------------
// Startup
// --------------------------------------------

console.log(
  "================================"
);

console.log(
  "PROTOTYPE-1 SECURE BACKEND"
);

console.log(
  "Status:",
  BACKEND_STATUS.status
);

console.log(
  "Broker:",
  BACKEND_STATUS.broker
);

console.log(
  "Market Data:",
  BACKEND_STATUS.marketData
);

console.log(
  "================================"
);
