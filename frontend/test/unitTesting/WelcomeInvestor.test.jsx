import { render, screen, fireEvent } from "@testing-library/react";
import { describe, test, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import WelcomeInvestor from "../../src/components/WelcomeInvestor/WelcomeInvestor.jsx";

vi.mock("../../src/assets/evaluation-icon.png", () => ({ default: "evaluation.png" }));
vi.mock("../../src/assets/totalvalue-icon.png", () => ({ default: "totalvalue.png" }));
vi.mock("../../src/assets/gain-icon.png", () => ({ default: "gain.png" }));
vi.mock("../../src/assets/overallgraph-icon.png", () => ({ default: "overallgraph.png" }));
vi.mock("axios");

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

vi.mock("../../src/components/WelcomeInvestor/WelcomeInvestor.css", () => ({}));

function renderWithQueryClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockNavigate.mockReset();
});

function mockDashboardRequests({
  valuation = {
    totalValuation: 100000,
    todayProfitLoss: 500,
    todayProfitLosspercentage: 1.2,
    overallProfitLoss: 7000,
    overallProfitLosspercentage: 8.5,
  },
  profileName = "John Doe",
  summary = [],
  trendingStocks = [],
}) {
  axios.get.mockImplementation((url) => {
    if (url.includes("/dashboard/valuation/")) {
      return Promise.resolve({ data: { data: valuation } });
    }

    if (url.includes("/users/profile/")) {
      return Promise.resolve({ data: { data: { name: profileName } } });
    }

    if (url.includes("/portfolio/summary/")) {
      return Promise.resolve({ data: { summary } });
    }

    if (url.includes("/dashboard/market/active/")) {
      return Promise.resolve({ data: { data: trendingStocks } });
    }

    return Promise.reject(new Error(`Unexpected URL: ${url}`));
  });
}

describe("WelcomeInvestor", () => {
  test("renders dashboard data and trending stocks", async () => {
    mockDashboardRequests({
      trendingStocks: [
        {
          shortName: "Reliance",
          symbol: "RELI",
          exchange: "NSE",
          price: 2500,
          change: 10,
          changePercent: 0.4,
        },
      ],
    });

    renderWithQueryClient(<WelcomeInvestor />);

    await screen.findByText("Total Portfolio Value");
    expect(screen.getByText(/Welcome back,/i)).toBeInTheDocument();
    expect(await screen.findByText("Reliance")).toBeInTheDocument();
  });

  test("uses portfolio summary market caps to show aggressive risk on dashboard", async () => {
    mockDashboardRequests({
      valuation: {
        totalValuation: 100000,
        todayProfitLoss: 100,
        todayProfitLosspercentage: 0.5,
        overallProfitLoss: 1000,
        overallProfitLosspercentage: 10,
      },
      summary: new Array(5).fill({ marketcap: 1e10 }),
    });

    renderWithQueryClient(<WelcomeInvestor />);

    await screen.findByText("Aggressive");
  });

  test("uses portfolio summary market caps to show conservative risk on dashboard", async () => {
    mockDashboardRequests({
      valuation: {
        totalValuation: 100000,
        todayProfitLoss: -500,
        todayProfitLosspercentage: -1.2,
        overallProfitLoss: -7000,
        overallProfitLosspercentage: -8.5,
      },
      summary: [
        { marketcap: 3e11 },
        { marketcap: 4e11 },
        { marketcap: 5e11 },
      ],
    });

    renderWithQueryClient(<WelcomeInvestor />);

    await screen.findByText("Conservative");
  });

  test("navigates to stock details on trending stock click", async () => {
    mockDashboardRequests({
      trendingStocks: [
        {
          shortName: "TCS",
          symbol: "TCS",
          exchange: "NSE",
          price: 3000,
          change: 15,
          changePercent: 0.5,
        },
      ],
    });

    renderWithQueryClient(<WelcomeInvestor />);

    const stockItem = await screen.findByText("TCS");
    fireEvent.click(stockItem);

    expect(mockNavigate).toHaveBeenCalledWith("/stockdetails/TCS");
  });
});
