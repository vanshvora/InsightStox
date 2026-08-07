import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { vi, beforeEach, describe, test, expect } from "vitest";
import axios from "axios";

vi.mock("axios");
vi.mock("../../src/components/MyHoldings/MyHoldings.css", () => ({}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    Link: ({ children, to }) => <a href={to}>{children}</a>,
    useNavigate: () => mockNavigate,
  };
});

import MyHoldings from "../../src/components/MyHoldings/MyHoldings.jsx";

const mockHoldings = [
  {
    name: "Tata Consultancy Services",
    symbol: "TCS",
    shares: 10,
    avgPrice: 3200,
    lastPrice: 3500,
    marketValue: 35000,
  },
  {
    name: "Infosys Limited",
    symbol: "INFY",
    shares: 5,
    avgPrice: 1400,
    lastPrice: 1500,
    marketValue: 7500,
  },
];

function renderWithQueryClient(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
}

describe("MyHoldings Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockNavigate.mockReset();
  });

  test("shows loading state initially", async () => {
    axios.get.mockResolvedValueOnce({
      data: { data: mockHoldings },
    });

    renderWithQueryClient(<MyHoldings />);

    expect(screen.getByText("Loading holdings...")).toBeInTheDocument();

    await waitFor(() => expect(axios.get).toHaveBeenCalled());
  });

  test("renders holdings in a watchlist-style table layout", async () => {
    axios.get.mockResolvedValueOnce({
      data: { data: mockHoldings },
    });

    renderWithQueryClient(<MyHoldings />);

    expect(await screen.findByText("Tata Consultancy Services")).toBeInTheDocument();
    expect(screen.getByText("TCS")).toBeInTheDocument();
    expect(screen.getByText("Infosys Limited")).toBeInTheDocument();
    expect(screen.getByText("3,200.00")).toBeInTheDocument();
    expect(screen.getByText("3,500.00")).toBeInTheDocument();
    expect(screen.getByText("35,000.00")).toBeInTheDocument();
    expect(screen.getByText("7,500.00")).toBeInTheDocument();
  });

  test("navigates to stock details from the holding row", async () => {
    axios.get.mockResolvedValueOnce({
      data: { data: mockHoldings },
    });

    renderWithQueryClient(<MyHoldings />);

    fireEvent.click(await screen.findByText("Tata Consultancy Services"));

    expect(mockNavigate).toHaveBeenCalledWith("/stockdetails/TCS");
  });

  test("shows an empty holdings state", async () => {
    axios.get.mockResolvedValueOnce({
      data: { data: [] },
    });

    renderWithQueryClient(<MyHoldings />);

    expect(await screen.findByText("Nothing in holdings yet")).toBeInTheDocument();
  });

  test("handles invalid response format", async () => {
    axios.get.mockResolvedValueOnce({
      data: { message: "wrong format" },
    });

    renderWithQueryClient(<MyHoldings />);

    expect(await screen.findByText(/Failed to load holdings:/i)).toBeInTheDocument();
  });
});
