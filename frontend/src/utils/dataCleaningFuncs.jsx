export const roundTo = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(Number(num))) return "--";
    return Number.parseFloat(num).toFixed(decimals);
};

export const formatPercentage = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(Number(num))) return "--";
    const val = Number(num);
    const percent = Math.abs(val) < 1 ? val * 100 : val;
    return percent.toFixed(decimals);
};

export const formatLargeNumber = (num) => {
    if (num === null || num === undefined || isNaN(Number(num))) return "--";

    const val = Number(num);
    const absNum = Math.abs(val);
    if (absNum >= 1e12) return (val / 1e12).toFixed(2) + "T";
    if (absNum >= 1e9) return (val / 1e9).toFixed(2) + "B";
    if (absNum >= 1e6) return (val / 1e6).toFixed(2) + "M";
    if (absNum >= 1e3) return (val / 1e3).toFixed(2) + "K";
    return val.toFixed(2);
};

export const formatSmallNumber = (num) => {
    if (num === null || num === undefined || isNaN(Number(num))) return "--";
    const val = Number.parseFloat(num);
    if (Math.abs(val) < 1e-2) return "0";
    return val.toFixed(2);
};

export const formatDate = (value) => {
    if (value === null || value === undefined || value === "") return "--";

    // Yahoo sometimes returns epoch seconds/ms as a number
    let date;
    if (typeof value === "number") {
        date = new Date(value > 1e12 ? value : value * 1000);
    } else if (typeof value === "string") {
        if (value.startsWith("-")) return "--";
        // numeric string timestamp
        if (/^\d+$/.test(value.trim())) {
            const n = Number(value);
            date = new Date(n > 1e12 ? n : n * 1000);
        } else {
            date = new Date(value);
        }
    } else {
        date = new Date(value);
    }

    if (Number.isNaN(date.getTime())) return "--";

    return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

// Classifier function for categorizing market caps
export function getCapCategory(marketcap) {

    marketcap = Number(marketcap);

    if (!marketcap || marketcap <= 0) return "unknown";

    // Large Cap: > 20,000 Crore
    if (marketcap >= 20000 * 1e7) return "large";

    // Mid Cap: 5,000–20,000 Crore
    if (marketcap >= 5000 * 1e7) return "mid";

    // Small Cap: below 5,000 Crore
    return "small";
}

// Portfolio risk calculator
export function getPortfolioRiskFromCaps(portfolio) {
    let smallcap = 0;
    let midcap = 0;
    let largecap = 0;

    portfolio.forEach(stock => {
        const category = getCapCategory(stock.marketcap);

        if (category === "large") largecap++;
        else if (category === "mid") midcap++;
        else if (category === "small") smallcap++;
    });

    // Weighted risk score
    const riskScore = smallcap * 3 + midcap * 2 + largecap * 1;

    if (riskScore >= 15) return "Aggressive";
    if (riskScore >= 9) return "Moderate";
    return "Conservative";
}

// Function to betterly represent large amounts
export function formatWithIndianCommas(num) {
  if (num === null || num === undefined || isNaN(Number(num))) return "--";
  return Number(num).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

