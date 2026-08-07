// test/unitTesting/SignupForm.test.jsx
import React from "react";
import { render, screen, waitFor,act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SignupForm from "../../src/components/SignupForm.jsx"; // adjust if needed
import axios from "axios";
import { vi, describe, test, expect } from "vitest";
import logoDark from "../../src/assets/Logodark.png";
import { MemoryRouter } from "react-router-dom";
const mockNavigate = vi.fn();
const mockSetUserLoggedIn = vi.fn();
// ---- Mocks ----
vi.mock("axios");
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});
// Mock AppContext
vi.mock("../../src/context/AppContext.jsx", () => {
  return {
    useAppContext: () => ({
      setUserLoggedIn: vi.fn(),
    }),
  };
});


// Mock InputField
vi.mock("../../src/components/InputField.jsx", () => {
  return {
    default: ({ id, value, onChange, placeholder }) => (
      <input
        data-testid={`input-${id}`}
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    ),
  };
});

// Mock PasswordInputField
vi.mock("../../src/components/PasswordInputField.jsx", () => {
  return {
    default: ({ id, value, onChange, placeholder }) => (
      <input
        data-testid={`input-${id}`}
        id={id}
        type="password"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
      />
    ),
  };
});

// 🧹 Clean up
afterEach(() => {
  vi.clearAllMocks();
});

describe("SignupForm (unit) - OTP generation path", () => {

  test("fills fields, accepts privacy policy, clicks Sign Up and starts OTP flow", async () => {

    axios.post.mockResolvedValue({ data: { message: "OTP sent" } });

    // 🟦 Render inside MemoryRouter (fix)
    render(
      <MemoryRouter>
        <SignupForm toggleForm={vi.fn()} resetFormStates={vi.fn()} />
      </MemoryRouter>
    );

    // Check opening title
    expect(
      screen.getByRole("heading", { level: 1 })
    ).toHaveTextContent(/create your account/i);

    const user = userEvent.setup();

    const signUpButton = screen.getByRole("button", { name: /sign up/i });
    // Fill inputs
    await user.type(screen.getByTestId("input-name"), "John Doe");
     expect(signUpButton).toBeDisabled();
    await user.type(screen.getByTestId("input-email"), "john@example.com");
     expect(signUpButton).toBeDisabled();
    await user.type(screen.getByTestId("input-password"), "StrongPass1!");
     expect(signUpButton).toBeDisabled();
     await user.type(screen.getByTestId("input-confirmPassword"), "StrongPass1!");
     expect(signUpButton).toBeDisabled();

    // Click privacy checkbox
    await user.click(screen.getByRole("checkbox"));

    expect(signUpButton).not.toBeDisabled();

    await user.click(signUpButton);

    // axios must be called
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
      expect(axios.post.mock.calls[0][0]).toContain("registerOtpGeneration");
    });

    // Title should change to OTP page
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 1 })
      ).toHaveTextContent(/check your email for the otp/i);
    });
  });

test("even if checkbox checked, wrong inputs must keep SignUp disabled", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <SignupForm toggleForm={vi.fn()} resetFormStates={vi.fn()} />
      </MemoryRouter>
    );

    const nameInput = screen.getByTestId("input-name");
    const emailInput = screen.getByTestId("input-email");
    const passwordInput = screen.getByTestId("input-password");
    const confirmInput = screen.getByTestId("input-confirmPassword");
    const checkbox = screen.getByRole("checkbox");
    const signUpButton = screen.getByRole("button", { name: /sign up/i });

    // Tick checkbox first (important)
    await user.click(checkbox);
    expect(checkbox).toBeChecked();

    // ---------------- CASE 1: INVALID EMAIL ----------------
    await user.type(nameInput, "John Doe");
    await user.type(emailInput, "wrong-email");
    await user.type(passwordInput, "StrongPass1!");
    await user.type(confirmInput, "StrongPass1!");

    expect(signUpButton).toBeDisabled();

    // ---------------- CASE 2: INVALID NAME ----------------
    await user.clear(emailInput);
    await user.type(emailInput, "john@example.com");

    await user.clear(nameInput);
    await user.type(nameInput, "John123");

    expect(signUpButton).toBeDisabled();

    // ---------------- CASE 3: WEAK PASSWORD ----------------
    await user.clear(nameInput);
    await user.type(nameInput, "John Doe");

    await user.clear(passwordInput);
    await user.type(passwordInput, "123");
    await user.clear(confirmInput);
    await user.type(confirmInput, "123");

    expect(signUpButton).toBeDisabled();

    // ---------------- CASE 4: VALID INPUTS EXCEPT CHECKBOX ----------------
    await user.clear(passwordInput);
    await user.type(passwordInput, "StrongPass1!");

    await user.clear(confirmInput);
    await user.type(confirmInput, "StrongPass1!");
    await user.click(checkbox);
    expect(signUpButton).toBeDisabled();
    await user.click(checkbox);
    expect(signUpButton).not.toBeDisabled();

    await user.clear(emailInput);
    await user.type(emailInput, "wrong-email");
    expect(signUpButton).toBeDisabled();

    // ---------------- CASE 5: PRIVACY POPUP FLOW ----------------
const policyLink = screen.getByText(/privacy policy/i);
await user.click(policyLink);

// FIRST → Accept & Close button (original behavior)
const acceptBtn = screen.getByRole("button", { name: /accept & close/i });
await user.click(acceptBtn);

// Popup should be closed now
expect(document.querySelector(".privacy-popup-overlay")).not.toBeInTheDocument();

// SECOND → Re-open popup to test CLOSE (X) button
await user.click(policyLink);

// Close button is available now
const closeBtn = document.querySelector(".privacy-close-btn");   // ⭐ added
await user.click(closeBtn);                                      // ⭐ added

// Popup should close again
expect(document.querySelector(".privacy-popup-overlay")).not.toBeInTheDocument();

// THIRD → Re-open popup again to test overlay click
await user.click(policyLink);

// Now overlay exists again
const overlay = document.querySelector(".privacy-popup-overlay");

// Click overlay → covers setPrivacyPopup(false)
await user.click(overlay);

// Ensure popup closed
expect(document.querySelector(".privacy-popup-overlay")).not.toBeInTheDocument();


});


test("OTP page: verify OTP works correctly when user enters OTP", async () => {
  const user = userEvent.setup();

  // First call → OTP sent
  axios.post.mockResolvedValueOnce({ data: { message: "OTP sent" } });

  // Second call → OTP verified
  axios.post.mockResolvedValueOnce({ data: { message: "Registered" } });

  render(
    <MemoryRouter>
      <SignupForm toggleForm={vi.fn()} resetFormStates={vi.fn()} />
    </MemoryRouter>
  );

  // Fill signup form
  await user.type(screen.getByTestId("input-name"), "John Doe");
  await user.type(screen.getByTestId("input-email"), "john@example.com");
  await user.type(screen.getByTestId("input-password"), "StrongPass1!");
  await user.type(screen.getByTestId("input-confirmPassword"), "StrongPass1!");
  await user.click(screen.getByRole("checkbox"));

  // Signup
  await user.click(screen.getByRole("button", { name: /sign up/i }));

  // OTP screen appears
  await screen.findByText(/check your email/i);

  const verifyBtn = screen.getByRole("button", { name: /verify otp/i });
  const resendBtn = screen.getByRole("button", { name: /resend/i });

  // Both disabled initially
  expect(verifyBtn).toBeDisabled();
  expect(resendBtn).toBeDisabled();

  // Type OTP → verify enabled
  await user.type(screen.getByTestId("input-otp"), "123456");
  expect(verifyBtn).not.toBeDisabled();

  // Bypass timer – enable resend manually for test
  resendBtn.disabled = false;

  // Verify OTP
  await user.click(verifyBtn);

  expect(axios.post).toHaveBeenLastCalledWith(
    expect.stringContaining("/users/register/"),
    { email: "john@example.com", otp: "123456" },
    { withCredentials: true }
  );

  expect(mockNavigate).toHaveBeenCalledWith("/Dashboard");
});

test("OTP page: wrong OTP shows error message", async () => {
  const user = userEvent.setup();

  axios.post.mockResolvedValueOnce({ data: { message: "OTP sent" } });

  axios.post.mockRejectedValueOnce({
    response: { data: { message: "Invalid OTP" } }
  });

  render(
    <MemoryRouter>
      <SignupForm toggleForm={vi.fn()} resetFormStates={vi.fn()} />
    </MemoryRouter>
  );

  // Fill signup fields
  await user.type(screen.getByTestId("input-name"), "John Doe");
  await user.type(screen.getByTestId("input-email"), "john@example.com");
  await user.type(screen.getByTestId("input-password"), "StrongPass1!");
  await user.type(screen.getByTestId("input-confirmPassword"), "StrongPass1!");
  await user.click(screen.getByRole("checkbox"));

  await user.click(screen.getByRole("button", { name: /sign up/i }));

  await screen.findByText(/check your email/i);

  // Enter wrong OTP
  await user.type(screen.getByTestId("input-otp"), "000000");

  const verifyBtn = screen.getByRole("button", { name: /verify otp/i });
  expect(verifyBtn).not.toBeDisabled();

  await user.click(verifyBtn);

  expect(await screen.findByText("Invalid OTP")).toBeInTheDocument();
});


test("Re-signup with same email triggers OTP error and clicking Login resets all fields", async () => {
  const user = userEvent.setup();

  const mockToggle = vi.fn();
  const mockParentReset = vi.fn();

  // First call → OTP success
  axios.post.mockResolvedValueOnce({ data: { message: "OTP sent" } });

  // Second call → email already exists
  axios.post.mockRejectedValueOnce({
    response: { data: { message: "User already exists" } }
  });

  render(
    <MemoryRouter>
      <SignupForm toggleForm={mockToggle} resetFormStates={mockParentReset} />
    </MemoryRouter>
  );

  /* --------------------------------------
     FIRST SIGNUP — OTP SENT SUCCESSFULLY
  ----------------------------------------- */

  await user.type(screen.getByTestId("input-name"), "John Doe");
  await user.type(screen.getByTestId("input-email"), "john@example.com");
  await user.type(screen.getByTestId("input-password"), "StrongPass1!");
  await user.type(screen.getByTestId("input-confirmPassword"), "StrongPass1!");
  await user.click(screen.getByRole("checkbox"));

  await user.click(screen.getByRole("button", { name: /sign up/i }));

  // OTP page should be visible now
  await screen.findByText(/check your email/i);

  /* ---------------------------------------------------
     NOW SIMULATE USER GOING BACK TO SIGNUP (RESET UI)
     --------------------------------------------------- */

  // Click LOGIN link → this calls resetFormStates()
  const loginLink = screen.getByText(/login/i);
  await user.click(loginLink);

  // Assert resetFormStates() ran
  expect(mockParentReset).toHaveBeenCalled();

  // toggleForm also runs
  expect(mockToggle).toHaveBeenCalled();

  // All fields reset after Login click
  expect(screen.getByTestId("input-name")).toHaveValue("");
  expect(screen.getByTestId("input-email")).toHaveValue("");
  expect(screen.getByTestId("input-password")).toHaveValue("");
  expect(screen.getByTestId("input-confirmPassword")).toHaveValue("");

  /* ----------------------------------------------------
     SECOND SIGNUP (same email) — SHOULD TRIGGER ERROR
     ---------------------------------------------------- */

  await user.type(screen.getByTestId("input-name"), "John Doe");
  await user.type(screen.getByTestId("input-email"), "john@example.com");
  await user.type(screen.getByTestId("input-password"), "StrongPass1!");
  await user.type(screen.getByTestId("input-confirmPassword"), "StrongPass1!");
  await user.click(screen.getByRole("checkbox"));

  await user.click(screen.getByRole("button", { name: /sign up/i }));

  // NOW the catch block should fire
  expect(await screen.findByText("User already exists")).toBeInTheDocument();
});



});
