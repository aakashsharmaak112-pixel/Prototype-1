// ==========================================
// PROTOTYPE-1 FINAL ALLOCATION TEST
// Safe test - does not change live allocation
// ==========================================

function runAllocationTests() {
  console.log("======================================");
  console.log("PROTOTYPE-1 ALLOCATION ENGINE TEST");
  console.log("======================================");

  const testAmounts = [
    5000,
    10000,
    25000,
    50000,
    100000,
    500000,
    1000000
  ];

  if (typeof buildTop20BudgetPlan !== "function") {
    console.error("❌ buildTop20BudgetPlan() not found");
    return;
  }

  testAmounts.forEach(function (amount) {
    try {
      const result = buildTop20BudgetPlan(amount);

      if (!result) {
        console.error(`❌ ₹${amount}: No result returned`);
        return;
      }

      const totalInvestment = Number(result.totalInvestment || 0);
      const balance = Number(result.balance || 0);

      const budgetExceeded = totalInvestment > amount + 0.01;

      console.log("--------------------------------------");
      console.log(`Investment: ₹${amount}`);
      console.log(`Allocated:  ₹${totalInvestment.toFixed(2)}`);
      console.log(`Balance:    ₹${balance.toFixed(2)}`);

      if (budgetExceeded) {
        console.error(
          `❌ FAILED: Allocation exceeded budget by ₹${(
            totalInvestment - amount
          ).toFixed(2)}`
        );
      } else {
        console.log("✅ Budget check passed");
      }

      if (Array.isArray(result.selectedStocks)) {
        console.log(
          `Stocks selected: ${result.selectedStocks.length}`
        );
      }

      if (result.sectorPercent) {
        console.log("Sector allocation:", result.sectorPercent);
      }

      if (result.groupPercent) {
        console.log("Business-group allocation:", result.groupPercent);
      }

    } catch (error) {
      console.error(
        `❌ ₹${amount}: Test crashed`,
        error
      );
    }
  });

  console.log("======================================");
  console.log("ALLOCATION TEST COMPLETED");
  console.log("======================================");
}
