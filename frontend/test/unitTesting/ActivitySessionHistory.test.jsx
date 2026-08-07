import { vi, describe, it, expect, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";

// Force backend URL for all tests (Option A + B)
vi.stubEnv("VITE_BACKEND_LINK", "http://localhost:8000");

// ---------------- MOCKS ----------------
vi.mock("axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    delete: vi.fn(),
    defaults: { withCredentials: true }
  }
}));

vi.mock("../../src/components/Navbar.jsx", () => ({
  default: () => <div data-testid="navbar">Mock Navbar</div>
}));

vi.mock("../../src/components/Footer.jsx", () => ({
  default: () => <div data-testid="footer">Mock Footer</div>
}));

vi.mock("../../src/components/Sidebar.jsx", () => ({
  Sidebar: () => <div data-testid="sidebar">Mock Sidebar</div>
}));

import axios from "axios";
import { ActivitySessionHistory } from "../../src/pages/ActivitySessionHistory";

// Shortcuts
const mockGet = axios.get;
const mockPost = axios.post;
const mockDelete = axios.delete;

const renderUI = () =>
  render(
    <BrowserRouter>
      <ActivitySessionHistory />
    </BrowserRouter>
  );

// -----------------------------------------------------
// COMMON SUCCESSFUL DATA
// -----------------------------------------------------
const PROFILE = {
  data: {
    data: { name: "User A", email: "a@test.com", profileImage: "p.jpg" },
    history: {
      activities: [
        { createdAt: "2025-01-01T10:00:00Z", message: "Logged in" }
      ],
      alerts: [{ createdAt: "2025-01-01T09:00:00Z", message: "Alert A" }]
    }
  }
};

const SESSIONS = {
  data: {
    activeSessions: [
      {
        token: "s1",
        browser_type: "Chrome",
        os_type: "Windows",
        last_active_time: "2025-01-01T10:00:00Z"
      },
      {
        token: "s2",
        browser_type: "Firefox",
        os_type: "Linux",
        last_active_time: "2025-01-01T09:00:00Z"
      }
    ]
  }
};

const FULL_ALERTS = {
  data: {
    alerts: [
      { createdAt: "2025-01-01T08:00:00Z", message: "Alert 1" },
      { createdAt: "2025-01-01T07:00:00Z", message: "Alert 2" },
      { createdAt: "2025-01-01T06:00:00Z", message: "Alert 3" },
      { createdAt: "2025-01-01T05:00:00Z", message: "Alert 4" }
    ]
  }
};

const FULL_ACTIVITIES = {
  data: {
    history: [
      { createdAt: "2025-01-01T08:00:00Z", message: "View 1" },
      { createdAt: "2025-01-01T07:00:00Z", message: "View 2" },
      { createdAt: "2025-01-01T06:00:00Z", message: "View 3" },
      { createdAt: "2025-01-01T05:00:00Z", message: "View 4" },
      { createdAt: "2025-01-01T04:00:00Z", message: "View 5" }
    ]
  }
};

function mockSuccessSequence() {
  mockGet.mockResolvedValueOnce(PROFILE);       // myProfile
  mockGet.mockResolvedValueOnce(SESSIONS);      // sessions
  mockGet.mockResolvedValueOnce(FULL_ALERTS);   // full alerts
  mockGet.mockResolvedValueOnce(FULL_ACTIVITIES); // full history
}

// -----------------------------------------------------
// TEST SUITE — NOW 100% COVERAGE
// -----------------------------------------------------
describe("ActivitySessionHistory — FULL 100% Coverage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1 — basic render
  it("renders all sections", async () => {
    mockSuccessSequence();

    renderUI();

    await waitFor(() => {
      expect(screen.getByText("Activity & Session History")).toBeInTheDocument();
      expect(screen.getByTestId("navbar")).toBeInTheDocument();
      expect(screen.getByTestId("sidebar")).toBeInTheDocument();
      expect(screen.getByTestId("footer")).toBeInTheDocument();
    });
  });

  // 2 — sessions load
  it("loads active sessions", async () => {
    mockSuccessSequence();
    renderUI();

    await waitFor(() => {
      expect(screen.getByText(/Chrome - Windows/)).toBeInTheDocument();
      expect(screen.getByText(/Firefox - Linux/)).toBeInTheDocument();
    });
  });

  // 3 — session signout success
  it("signs out one session", async () => {
    mockSuccessSequence();
    mockPost.mockResolvedValueOnce({ status: 200 });

    renderUI();

    await waitFor(() => {
      expect(screen.getAllByTestId("signout-button").length).toBe(2);
    });

    fireEvent.click(screen.getAllByTestId("signout-button")[0]);

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "http://localhost:8000/users/logout/session/",
        { token: "s1" },
        { withCredentials: true }
      )
    );
  });

  // 4 — session signout failure path
  it("handles signout error", async () => {
    mockSuccessSequence();
    mockPost.mockRejectedValueOnce(new Error("signout failed"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderUI();

    await waitFor(() =>
      expect(screen.getAllByTestId("signout-button").length).toBe(2)
    );

    fireEvent.click(screen.getAllByTestId("signout-button")[0]);

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("Error signing out:", expect.any(Error))
    );
    spy.mockRestore();
  });

  // 5 — logout all success
  it("logs out all devices successfully", async () => {
    mockSuccessSequence();
    mockPost.mockResolvedValueOnce({ status: 200 });

    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("signout-all-button")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("signout-all-button"));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "http://localhost:8000/users/logout/all/",
        {},
        { withCredentials: true }
      )
    );
  });

  // 6 — logout all fail
  it("handles logout-all failure", async () => {
    mockSuccessSequence();
    mockPost.mockRejectedValueOnce(new Error("logout all failed"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("signout-all-button")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("signout-all-button"));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("Error signing out all:", expect.any(Error))
    );

    spy.mockRestore();
  });

  // 7 — security alerts see more toggle
  it("toggles security alerts see-more", async () => {
    mockSuccessSequence();
    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("security-seemore-button")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("security-seemore-button"));

    await waitFor(() =>
      expect(screen.getByTestId("security-seemore-button").textContent).toBe("See Less")
    );
  });

  // 8 — activities see more toggle
  it("toggles activity see-more", async () => {
    mockSuccessSequence();
    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("activity-seemore-button")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("activity-seemore-button"));

    await waitFor(() =>
      expect(screen.getByTestId("activity-seemore-button").textContent).toBe("See Less")
    );
  });

  // 9 — download success
  it("downloads activity report successfully", async () => {
    mockSuccessSequence();
    mockGet.mockResolvedValueOnce({ status: 200 });

    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("download-activity-button")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("download-activity-button"));

    await waitFor(() =>
      expect(mockGet).toHaveBeenCalledWith(
        "http://localhost:8000/users/activity/download/",
        { withCredentials: true }
      )
    );
  });

  // 10 — download failure
  it("handles download error", async () => {
    mockSuccessSequence();
    mockGet.mockRejectedValueOnce(new Error("download error"));

    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("download-activity-button")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("download-activity-button"));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("Error downloading report:", expect.any(Error))
    );

    spy.mockRestore();
  });

  // 11 — clear history success
  it("clears activity history", async () => {
    mockSuccessSequence();
    mockDelete.mockResolvedValueOnce({ status: 200 });

    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("clear-history-button")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("clear-history-button"));

    await waitFor(() =>
      expect(mockDelete).toHaveBeenCalledWith(
        "http://localhost:8000/users/activity/clear/",
        { withCredentials: true }
      )
    );
  });

  // 12 — clear history fail
  it("handles clear history error", async () => {
    mockSuccessSequence();
    mockDelete.mockRejectedValueOnce(new Error("clear error"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("clear-history-button")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByTestId("clear-history-button"));

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("Error clearing history:", expect.any(Error))
    );

    spy.mockRestore();
  });

  // 13 — empty sessions
  it("handles empty sessions list", async () => {
    mockGet.mockResolvedValueOnce(PROFILE);
    mockGet.mockResolvedValueOnce({ data: { activeSessions: [] } });
    mockGet.mockResolvedValueOnce(FULL_ALERTS);
    mockGet.mockResolvedValueOnce(FULL_ACTIVITIES);

    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("no-active-sessions")).toBeInTheDocument()
    );
  });

  // 14 — empty alerts
  it("handles empty security alerts", async () => {
    mockGet.mockResolvedValueOnce(PROFILE);
    mockGet.mockResolvedValueOnce(SESSIONS);
    mockGet.mockResolvedValueOnce({ data: { alerts: [] } });
    mockGet.mockResolvedValueOnce(FULL_ACTIVITIES);

    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("no-security-alerts")).toBeInTheDocument()
    );
  });

  // 15 — empty activities
  it("handles empty activity history", async () => {
    mockGet.mockResolvedValueOnce(PROFILE);
    mockGet.mockResolvedValueOnce(SESSIONS);
    mockGet.mockResolvedValueOnce(FULL_ALERTS);
    mockGet.mockResolvedValueOnce({ data: { history: [] } });

    renderUI();

    await waitFor(() =>
      expect(screen.getByTestId("no-activities")).toBeInTheDocument()
    );
  });

  // 16 — FULL ERROR on first fetch (myProfile)
  it("handles profile fetch error", async () => {
    mockGet.mockRejectedValueOnce(new Error("profile error"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    renderUI();

    await waitFor(() =>
      expect(screen.getByText("Activity & Session History")).toBeInTheDocument()
    );

    await waitFor(() =>
      expect(spy).toHaveBeenCalledWith("Error fetching all data:", expect.any(Error))
    );

    spy.mockRestore();
  });
});
