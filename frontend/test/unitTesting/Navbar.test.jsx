import { render, screen ,fireEvent,act,waitFor} from "@testing-library/react";
import { vi } from "vitest";
import Navbar from "../../src/components/Navbar.jsx";
import axios from "axios";
vi.mock("axios");
const mockNavigate = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
});
// Mock React Router
vi.mock("react-router-dom", () => ({
   Link: ({ children, to, onClick }) =>
    <a href={to} onClick={onClick}>{children}</a>,
   useNavigate: () => mockNavigate,
}));

// Mock Context
vi.mock("../../src/context/AppContext", () => ({
  useAppContext: () => ({
    userDetails: ({ userDetails: {} }) ,  // default
  })
}));

// Mock CSS + image assets
vi.mock("../../src/components/Navbar.css", () => ({}));
vi.mock("../../src/assets/web_logo_without_bg_darkmode.png", () => ({ default: "dark-logo.png" }));
vi.mock("../../src/assets/web_logo_without_bg_lightmode.png", () => ({ default: "light-logo.png" }));
vi.mock("../../src/assets/profileicon.svg", () => ({ default: "profileicon.svg" }));
vi.mock("../../src/assets/themetoggledark.svg", () => ({ default: "toggledark.svg" }));
vi.mock("../../src/assets/routeicon.svg", () => ({ default: "route.svg" }));
vi.mock("../../src/assets/exiticon.svg", () => ({ default: "exit.svg" }));


describe("Navbar Component", () => {
  test("renders the correct navbar logo based on darkMode prop", () => {
  // 1️⃣ Light mode (darkMode = false)
  const { rerender } = render(
    <Navbar darkMode={false} pageType="/" profileData={{}} />
  );

  let logo = screen.getByAltText("Logo");
  expect(logo).toBeInTheDocument();
  expect(logo).toHaveAttribute("src", "light-logo.png");

  // 2️⃣ Dark mode (darkMode = true)
  rerender(<Navbar darkMode={true} pageType="/" profileData={{}} />);

  logo = screen.getByAltText("Logo");
  expect(logo).toHaveAttribute("src", "dark-logo.png");

  // 3️⃣ Optional: verify logo link wrapper exists
  const logoLink = logo.closest("a");
  expect(logoLink).toBeInTheDocument();
});


test('shows "Log In" button ONLY when pageType is "/" and sets sessionStorage on click', () => {
  render(<Navbar darkMode={false} pageType="/" profileData={{}} />);

  // 1️⃣ Login button should exist
  const loginBtn = screen.getByRole("button", { name: "Log In" });
  expect(loginBtn).toBeInTheDocument();

  // 2️⃣ It should be inside a <Link> with /auth
  const loginLink = loginBtn.closest("a");
  expect(loginLink).toHaveAttribute("href", "/auth");

  // 3️⃣ Clicking login should update sessionStorage correctly
  fireEvent.click(loginBtn);

  expect(sessionStorage.getItem("isLogin")).toBe("true");
  expect(sessionStorage.getItem("forgotpassword")).toBe("false");

  // 4️⃣ Profile button should NOT appear on landing page
  expect(screen.queryByAltText("Profile")).not.toBeInTheDocument();
});

test("renders homepage navigation buttons only when pageType is '/' & dashboard navigation buttons only when pageType is not 'Dashboard'", () => {
  render(<Navbar darkMode={false} pageType="/" profileData={{}} />);

  // 1️⃣ Buttons should appear
  const featuresBtn = screen.getByText("Features");
  const howBtn = screen.getByText("How it Works?");
  const faqBtn = screen.getByText("FAQs");

  expect(featuresBtn).toBeInTheDocument();
  expect(howBtn).toBeInTheDocument();
  expect(faqBtn).toBeInTheDocument();

  // 2️⃣ Buttons should link to correct anchors
  expect(featuresBtn.closest("a")).toHaveAttribute("href", "#feature");
  expect(howBtn.closest("a")).toHaveAttribute("href", "#HowItWorks");
  expect(faqBtn.closest("a")).toHaveAttribute("href", "#FAQs");

  // 3️⃣ Dashboard links should NOT appear on home page
  expect(screen.queryByText("Dashboard")).not.toBeInTheDocument();
  expect(screen.queryByText("AI Insights")).not.toBeInTheDocument();
  expect(screen.queryByText("Watchlist")).not.toBeInTheDocument();

  render(<Navbar darkMode={false} pageType="dashboard" profileData={{}} />);

  expect(screen.getByText("Dashboard")).toBeInTheDocument();
  expect(screen.getByText("Portfolio")).toBeInTheDocument();
  expect(screen.getByText("AI Insights")).toBeInTheDocument();
  expect(screen.getByText("Compare Stocks")).toBeInTheDocument();
  expect(screen.getByText("Watchlist")).toBeInTheDocument();
});


test("shows profile button, uses correct image, and opens popup when profileData exists", () => {
  const profileData = { name: "John", email: "john@example.com" };

  const { container } = render(
    <Navbar 
      darkMode={false} 
      pageType="/dashboard" 
      profileData={profileData}
    />
  );

  // 1️⃣ Profile button should appear
  const profileImg = screen.getByAltText("Profile");
  expect(profileImg).toBeInTheDocument();

  // 2️⃣ Fallback image should be used because userDetails.profileImage = null
  expect(profileImg).toHaveAttribute("src", "profileicon.svg");

  // 3️⃣ The profile icon should be visible (since pageType="/dashboard")
  expect(profileImg).toHaveStyle("visibility: visible");

  // 4️⃣ Clicking the profile button should open popup
  fireEvent.click(profileImg);

  const popup = container.querySelector(".profilepopup");
  expect(popup).toBeInTheDocument();

  // 5️⃣ Popup should show correct data
  expect(screen.getByText("John")).toBeInTheDocument();
  expect(screen.getByText("john@example.com")).toBeInTheDocument();

  // 6️⃣ Popup overlay should appear and clicking it closes the popup
  const overlay = container.querySelector(".profileoverlay");
  expect(overlay).toBeInTheDocument();

  fireEvent.click(overlay);
  expect(container.querySelector(".profilepopup")).not.toBeInTheDocument();

});

test("opens and closes the mobile menu when hamburger icon is clicked", () => {
  const { container } = render(
    <Navbar 
      darkMode={false}
      pageType="/dashboard"
      profileData={{}}
    />
  );

  // 1️⃣ Mobile menu should NOT be visible initially
  expect(container.querySelector(".mobile_menu")).not.toBeInTheDocument();

  // 2️⃣ The hamburger icon should exist and be clickable
  const menuIcon = container.querySelector(".menu_toggle");
  expect(menuIcon).toBeInTheDocument();

  // 3️⃣ Click to OPEN menu
  fireEvent.click(menuIcon);
  const mobileMenu = container.querySelector(".mobile_menu");
  expect(mobileMenu).toBeInTheDocument();

  // 4️⃣ Mobile menu should show dashboard links (based on pageType)
  expect(screen.getAllByText("Dashboard")[0]).toBeInTheDocument();
  expect(screen.getAllByText("AI Insights")[0]).toBeInTheDocument();
  expect(screen.getAllByText("Watchlist")[0]).toBeInTheDocument();

  // 5️⃣ Clicking the overlay should close the menu
  const overlay = container.querySelector(".profileoverlay");
  expect(overlay).toBeInTheDocument();

  fireEvent.click(overlay);
  expect(container.querySelector(".mobile_menu")).not.toBeInTheDocument();

  // 6️⃣ Re-open menu again
  fireEvent.click(menuIcon);
  expect(container.querySelector(".mobile_menu")).toBeInTheDocument();

  // 7️⃣ Clicking menu icon again should close menu (toggle behavior)
  fireEvent.click(menuIcon);
  expect(container.querySelector(".mobile_menu")).not.toBeInTheDocument();
});

test("navigates to My Profile when clicked inside profile popup", async () => {
  const profileData = { name: "John", email: "john@example.com" };

  const { container } = render(
    <Navbar
      darkMode={false}
      pageType="/dashboard"
      profileData={profileData}
    />
  );

  // 1️⃣ Open profile popup by clicking profile button
  const profileImg = screen.getByAltText("Profile");
  fireEvent.click(profileImg);

  // Popup should now appear
  const popup = container.querySelector(".profilepopup");
  expect(popup).toBeInTheDocument();

  // 2️⃣ Get "My Profile" option
  const myProfileBtn = screen.getByText("My Profile");

  // Ensure it is inside the popup
  expect(myProfileBtn.closest("li")).toBeInTheDocument();

  // 3️⃣ Click "My Profile"
  fireEvent.click(myProfileBtn);

  // 4️⃣ Should navigate to /my-profile
  expect(mockNavigate).toHaveBeenCalledWith("/my-profile");
});


test("route links inside profile popup trigger correct navigation paths", () => {
  const profileData = { name: "John", email: "john@example.com" };

  const { container } = render(
    <Navbar
      darkMode={false}
      pageType="/dashboard"
      profileData={profileData}
    />
  );

  // 1️⃣ Click profile image to open popup
  const profileBtn = screen.getByAltText("Profile");
  fireEvent.click(profileBtn);

  // Popup should now appear
  const popup = container.querySelector(".profilepopup");
  expect(popup).toBeInTheDocument();

  // 2️⃣ My Profile → /my-profile
  const myProfileLi = screen.getByText("My Profile").closest("li");
  fireEvent.click(myProfileLi);
  expect(mockNavigate).toHaveBeenCalledWith("/my-profile");

  // 3️⃣ Manage → /data-privacy
  const manageLi = screen.getByText("Manage").closest("li");
  fireEvent.click(manageLi);
  expect(mockNavigate).toHaveBeenCalledWith("/data-privacy");

  // 4️⃣ Help & Support → /help-support
  const helpLi = screen.getByText("Help & Support").closest("li");
  fireEvent.click(helpLi);
  expect(mockNavigate).toHaveBeenCalledWith("/help-support");

  
});


test("uses fallback profile image when userDetails.profileImage is null & profile image visible", async () => {
  // Mock context with no profile image
  vi.mock("../../src/context/AppContext", () => ({
    useAppContext: () => ({
      userDetails: { profileImage: null }
    })
  }));

  const profileData = {
    name: "Test User",
    email: "test@example.com"
  };

  // Import Navbar AFTER mock
  const { default: NavbarComponent } = await import("../../src/components/Navbar.jsx");

  render(
    <NavbarComponent
      darkMode={false}
      pageType="/dashboard"
      profileData={profileData}
    />
  );

  const profileImg = screen.getByAltText("Profile");

  // Expect fallback image
  expect(profileImg.src).toContain("profileicon.svg");
  expect(profileImg.style.visibility).toBe("visible");
});

test("profile image is HIDDEN for home page '/'", async () => {
  vi.mock("../../src/context/AppContext", () => ({
    useAppContext: () => ({
      userDetails: { profileImage: null }
    })
  }));

  const profileData = { name: "User", email: "u@mail.com" };

  const { default: NavbarComponent } = await import("../../src/components/Navbar.jsx");

  render(
    <NavbarComponent
      darkMode={false}
      pageType="/"
      profileData={profileData}
    />
  );

  const profileImg = screen.queryByAltText("Profile");

  // Should not even render on home page because profileData exists but visibility:hidden applies
  expect(profileImg).toBeInTheDocument();
  expect(profileImg.style.visibility).toBe("hidden");
});

test("closes the mobile menu when window is resized above 1100px", () => {
  const profileData = { name: "User", email: "u@mail.com" };

  const { container } = render(
    <Navbar
      darkMode={false}
      pageType="/dashboard"
      profileData={profileData}
    />
  );
    expect(container.querySelector(".mobile_menu")).toBeNull();
  const menuIcon = container.querySelector(".menu_toggle");
  fireEvent.click(menuIcon);
  
  // Menu should now be visible
  expect(container.querySelector(".mobile_menu")).toBeInTheDocument();

  act(() => {
    window.innerWidth = 1200;
    window.dispatchEvent(new Event("resize"));
  });

  expect(container.querySelector(".mobile_menu")).toBeNull();
});

test("calls logout API and navigates to home on successful logout", async () => {
  // Arrange: mock axios success
  axios.post.mockResolvedValue({ data: { success: true } });

  const profileData = { name: "John", email: "john@example.com" };

  const { container } = render(
    <Navbar darkMode={false} pageType="/dashboard" profileData={profileData} />
  );

  // Open the profile popup
  const profileBtn = screen.getByAltText("Profile");
  fireEvent.click(profileBtn);

  // Ensure popup exists
  expect(container.querySelector(".profilepopup")).toBeInTheDocument();

  // Click the Log Out li (the LI has the onClick handler)
  const logoutLi = screen.getByText("Log Out").closest("li");
  expect(logoutLi).toBeInTheDocument();
  fireEvent.click(logoutLi);

  // Assert: axios.post was called with the expected logout URL (or contains path)
  await waitFor(() => expect(axios.post).toHaveBeenCalled());
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining("/users/logout/"),
    expect.any(Object) // component passes { withCredentials: true } as payload
  );

  // Assert: navigate was called to "/"
  expect(mockNavigate).toHaveBeenCalledWith("/");
});

// Logout failure
test("does not navigate when logout API fails (error handled)", async () => {

  axios.post.mockRejectedValue(new Error("Logout failed"));

  const profileData = { name: "John", email: "john@example.com" };

  const { container } = render(
    <Navbar darkMode={false} pageType="/dashboard" profileData={profileData} />
  );

  // Open popup
  const profileBtn = screen.getByAltText("Profile");
  fireEvent.click(profileBtn);

  // Click Log Out
  const logoutLi = screen.getByText("Log Out").closest("li");
  fireEvent.click(logoutLi);

  // Wait for axios call to have been attempted
  await waitFor(() => expect(axios.post).toHaveBeenCalled());

  // On failure, navigate should NOT be called
  expect(mockNavigate).not.toHaveBeenCalled();
});
test("mobile login link sets sessionStorage values on homepage", () => {
  const profileData = {};

  const { container } = render(
    <Navbar
      darkMode={false}
      pageType="/"
      profileData={profileData}
    />
  );

  // 1️⃣ menu closed initially
  expect(container.querySelector(".mobile_menu")).toBeNull();

  // 2️⃣ open mobile menu
  const menuIcon = container.querySelector(".menu_toggle");
  fireEvent.click(menuIcon);

  expect(container.querySelector(".mobile_menu")).toBeInTheDocument();

  // 3️⃣ locate MOBILE login li
  // (desktop login is a BUTTON, mobile login is an LI)
  const loginLi = screen.getAllByText("Log In")[0].closest("div");
  expect(loginLi).toBeInTheDocument();

  // 4️⃣ clear sessionStorage to check fresh writes
  sessionStorage.clear();

  // 5️⃣ click mobile login
  fireEvent.click(loginLi);

  // 6️⃣ check writes — THESE ARE THE LINES YOU WANT COVERED
  expect(sessionStorage.getItem("isLogin")).toBe("true");
  expect(sessionStorage.getItem("forgotpassword")).toBe("false");
});



});
