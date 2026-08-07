import React from "react";
import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import axios from "axios";

const mockSetIsSearchActive = vi.fn();

vi.mock("../../src/context/AppContext.jsx", () => ({
  useAppContext: () => ({
    userDetails: {
      name: "John Doe",
      email: "john@example.com",
    },
    setIsSearchActive: mockSetIsSearchActive,
    ensureAuth: vi.fn(() => Promise.resolve()),
  }),
}));

vi.mock("../../src/components/Navbar.jsx", () => ({
  default: () => <div>Navbar Mock</div>,
}));

vi.mock("../../src/components/Dashboard-Header.jsx", () => ({
  default: () => <div>DashboardHeader Mock</div>,
}));

vi.mock("../../src/components/PortfolioChart/PortfolioChart", () => ({
  default: () => <div>PortfolioChart Mock</div>,
}));

vi.mock("../../src/components/Footer.jsx", () => ({
  default: () => <div>Footer Mock</div>,
}));

vi.mock("../../src/components/PortfolioSummary", () => ({
  PortfolioSummary: () => <div>PortfolioSummary Mock</div>,
}));

vi.mock("../../src/components/PortfolioHoldings", () => ({
  PortfolioHoldings: () => <div>PortfolioHoldings Mock</div>,
}));

vi.mock("../../src/components/PortfolioFundamentals", () => ({
  PortfolioFundamentals: () => <div>PortfolioFundamentals Mock</div>,
}));

vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    defaults: { withCredentials: false },
  },
}));

import { Portfolio } from "../../src/pages/Portfolio";

function renderWithClient(ui, client) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Portfolio risk cache behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("uses cached portfolio summary data to show the correct risk after dashboard navigation", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Number.POSITIVE_INFINITY },
      },
    });

    queryClient.setQueryData(["portfolioSummary"], [
      { symbol: "NCLD", marketcap: 1e10, lastPrice: 22.75, change: 0, changePercent: 0, marketTime: "", totalValue: 2275, profitLoss: 0, profitLossPercentage: 0, allocationPercentage: 1 },
      { symbol: "HDFCBANK.NS", marketcap: 1e10, lastPrice: 731, change: 0, changePercent: 0, marketTime: "", totalValue: 146200, profitLoss: 0, profitLossPercentage: 0, allocationPercentage: 99 },
      { symbol: "A", marketcap: 1e10, lastPrice: 1, change: 0, changePercent: 0, marketTime: "", totalValue: 1, profitLoss: 0, profitLossPercentage: 0, allocationPercentage: 1 },
      { symbol: "B", marketcap: 1e10, lastPrice: 1, change: 0, changePercent: 0, marketTime: "", totalValue: 1, profitLoss: 0, profitLossPercentage: 0, allocationPercentage: 1 },
      { symbol: "C", marketcap: 1e10, lastPrice: 1, change: 0, changePercent: 0, marketTime: "", totalValue: 1, profitLoss: 0, profitLossPercentage: 0, allocationPercentage: 1 },
    ]);

    axios.get.mockImplementation((url) => {
      if (url.includes("/dashboard/valuation/")) {
        return Promise.resolve({
          data: {
            data: {
              totalValuation: 100000,
              totalInvestment: 90000,
              todayProfitLoss: 0,
              todayProfitLosspercentage: 0,
              overallProfitLoss: 10000,
              overallProfitLosspercentage: 10,
            },
          },
        });
      }

      if (url.includes("/portfolio/holdings/")) {
        return Promise.resolve({ data: { data: [] } });
      }

      if (url.includes("/portfolio/fundamentals/")) {
        return Promise.resolve({ data: { data: [] } });
      }

      return Promise.reject(new Error(`Unexpected URL: ${url}`));
    });

    renderWithClient(<Portfolio />, queryClient);

    expect(await screen.findByText("Aggressive")).toBeInTheDocument();
  });
});
