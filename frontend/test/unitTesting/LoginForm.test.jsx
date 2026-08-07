import { render, screen, fireEvent, act } from "@testing-library/react";
import { expect, vi } from "vitest";
import axios from "axios";
import LoginForm from "../../src/components/LoginForm.jsx";
import { validateEmail, checkPasswordStrength } from "../../src/utils/validation.js";

/* ---------------------------------------------------------
   1. MOCK AXIOS
--------------------------------------------------------- */
vi.mock("axios");

/* ---------------------------------------------------------
   2. MOCK REACT ROUTER (useNavigate)
--------------------------------------------------------- */
const mockNavigate = vi.fn();

vi.mock("react-router-dom", () => ({
  __esModule: true,
  useNavigate: () => mockNavigate,
}));

/* ---------------------------------------------------------
   3. MOCK GOOGLE LOGIN HOOK
--------------------------------------------------------- */
const mockGoogleLoginFn = vi.fn();
vi.mock("@react-oauth/google", () => ({
  useGoogleLogin: (config) => {
    return () => {
      mockGoogleLoginFn();
      // Simulate Google providing tokenResponse
      config.onSuccess({ access_token: "mock_token_123" });
    };
  },
}));
/* ---------------------------------------------------------
   4. MOCK CONTEXT (useAppContext)
--------------------------------------------------------- */
const mockSetUserLoggedIn = vi.fn();

vi.mock("../../src/context/AppContext.jsx", () => ({
  __esModule: true,
  useAppContext: () => ({
    userLoggedIn: false,
    setUserLoggedIn: mockSetUserLoggedIn,
  }),
}));

/* ---------------------------------------------------------
   5. MOCK CHILD COMPONENTS (InputField, PasswordInputField)
--------------------------------------------------------- */
vi.mock("../../src/components/InputField.jsx", () => ({
  __esModule: true,
  default: ({ labelVal, value, onChange, placeholder, styleVal }) => (
    <label style={styleVal}>
      {labelVal}
      <input
        aria-label={labelVal}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        style={styleVal}
      />
    </label>
  ),
}));

vi.mock("../../src/components/PasswordInputField.jsx", () => ({
  __esModule: true,
  default: ({ labelVal, value, onChange, placeholder, styleVal }) => (
    <div style={styleVal}>
      <label>
        {labelVal}
        <input
          aria-label={labelVal}
          type="password"
          value={value}
          placeholder={placeholder}
          onChange={onChange}
        />
      </label>
    </div>
  )
}));


/* ---------------------------------------------------------
   6. MOCK IMAGE IMPORTS
--------------------------------------------------------- */
vi.mock("../../src/assets/google_logo.svg", () => ({ default: "google.svg" }));
vi.mock("../../src/assets/LogoDark.png", () => ({ default: "logo.png" }));

/* ---------------------------------------------------------
   7. BEFORE EACH TEST
--------------------------------------------------------- */
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

/* ---------------------------------------------------------
   8. MOCK VALIDATION UTILITIES
--------------------------------------------------------- */
vi.mock("../../src/utils/validation.js", () => ({
  validateEmail: vi.fn((email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(email)),

  checkPasswordStrength: vi.fn((password) => {
    let missing = [];

    if (!/[a-z]/.test(password)) missing.push("lowercase letters");
    if (!/[A-Z]/.test(password)) missing.push("uppercase letters");
    if (!/\d/.test(password)) missing.push("digits");
    if (!/[@$!%*?&]/.test(password)) missing.push("special characters (@$!%*?&)");
    if (password.length < 8) missing.push("at least 8 characters");

    return missing.length === 0
      ? ""
      : `Password must contain ${missing.join(", ")}.`;
  }),
}));



describe("LoginForm Component", () => {
test("renders LoginForm with initial login UI correctly", () => {
  // Arrange
  sessionStorage.setItem("forgotpassword", "false");

  render(<LoginForm />);

  // Assert: Title
  expect(screen.getByText("Login to your account")).toBeInTheDocument();

  // Assert: Email + Password fields rendered
  expect(screen.getByText("Email")).toBeInTheDocument();
  expect(screen.getByText("Password")).toBeInTheDocument();

  // Assert: Forgot link is visible
  expect(screen.getByText("Forgot?")).toBeInTheDocument();

  // Assert: Login button exists and starts disabled
  const loginButton = screen.getByRole("button", { name: "Login" });
  expect(loginButton).toBeInTheDocument();
  expect(loginButton).toBeDisabled();

  // Assert: Google login button exists
  expect(screen.getByText("Continue with Google")).toBeInTheDocument();

  // Assert: Logo renders
  const img = screen.getByAltText("Dark Mode Logo");
  expect(img).toBeInTheDocument();
});

test("toggles Forgot Password mode and updates UI + sessionStorage", () => {
  // Arrange
  sessionStorage.setItem("forgotpassword", "false");

  render(<LoginForm />);

  // ---------- Initial UI checks ----------
  expect(screen.getByText("Login to your account")).toBeInTheDocument();
  expect(screen.getByText("Forgot?")).toBeInTheDocument();

  // Password field exists in login mode
  expect(screen.getByLabelText("Password")).toBeInTheDocument();

  // No Send OTP yet
  expect(screen.queryByRole("button", { name: /send otp/i })).not.toBeInTheDocument();

  // ---------- Click Forgot? ----------
  fireEvent.click(screen.getByText("Forgot?"));

  // ---------- Updated UI ----------
  expect(screen.getByText("Reset your password")).toBeInTheDocument();

  // Password field hidden now
  expect(screen.getByLabelText("Password")).not.toBeVisible();

  // Send OTP button now visible
  expect(screen.getByRole("button", { name: /send otp/i })).toBeInTheDocument();

  // sessionStorage updated
  expect(sessionStorage.getItem("forgotpassword")).toBe("true");

  // ---------- Click "Login" (return to login mode) ----------
  fireEvent.click(screen.getByText("Login")); // the link that appears in forgot mode

  // UI returns to normal login mode
  expect(screen.getByText("Login to your account")).toBeInTheDocument();
  expect(sessionStorage.getItem("forgotpassword")).toBe("false");

  // Password field returns
  expect(screen.getByLabelText("Email")).toBeInTheDocument();
});

test("login button enables only when email is valid and password is non-empty", async () => {
  axios.post.mockRejectedValueOnce({
    response: { data: { message: "Incorrect password" } }
  });
  render(<LoginForm />);

  const loginBtn = screen.getByRole("button", { name: /login/i });
  const emailInput = screen.getByLabelText("Email");
  const passwordInput = screen.getByLabelText("Password");

  // Initially disabled
  expect(loginBtn).toBeDisabled();

  // 1️⃣ Type invalid email
  fireEvent.change(emailInput, { target: { value: "invalid" } });

  // Email error appears
  expect(screen.getByText("Invalid email format")).toBeInTheDocument();

  // Still disabled
  expect(loginBtn).toBeDisabled();

  // 2️⃣ Type valid email
  fireEvent.change(emailInput, { target: { value: "user@example.com" } });

  // Error disappears
  expect(screen.queryByText("Invalid email format")).not.toBeInTheDocument();

  // Still disabled because password empty
  expect(loginBtn).toBeDisabled();

  // 3️⃣ Enter ANY password (strength irrelevant in login)
  fireEvent.change(passwordInput, { target: { value: "abc" } });

  // Button now should be enabled
  expect(loginBtn).not.toBeDisabled();
  fireEvent.click(loginBtn);
  const errorMsg = await screen.findByText("Incorrect password");
  expect(errorMsg).toBeInTheDocument();
});


test("sends OTP successfully and updates UI (Send OTP → Verify OTP)", async () => {
  // Mock successful OTP response
  axios.post.mockResolvedValueOnce({
    data: { message: "OTP sent successfully" }
  });

  render(<LoginForm />);

  const emailInput = screen.getByLabelText("Email");

  // Switch to forgot password mode
  fireEvent.click(screen.getByText("Forgot?"));
  
  // Enter valid email
  fireEvent.change(emailInput, { target: { value: "user@example.com" } });

  // Send OTP button
  const sendOtpBtn = screen.getByRole("button", { name: /send otp/i });

  // Initially Button enabled? (email valid)
  expect(sendOtpBtn).not.toBeDisabled();

  // Click send OTP
  fireEvent.click(sendOtpBtn);

  // axios call should match backend spec
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining("/forgotPasswordOtpGeneration"),
    { email: "user@example.com" },
    { withCredentials: true }
  );

  // OTP input becomes visible
  expect(await screen.findByLabelText("OTP")).toBeInTheDocument();

  // Button text changes to "Verify OTP"
  expect(
    screen.getByRole("button", { name: /verify otp/i })
  ).toBeInTheDocument();

  // forgotUserExists should now be true → resend button appears (timer > 0)
  expect(screen.getByText(/Resend in/i)).toBeInTheDocument();

});

test("Google login button triggers login flow", async () => {
    // Mock API response
    axios.post.mockResolvedValue({
      data: { message: "Google login success" },
    });

    render(<LoginForm />);

    // Click Google button
    const googleButton = screen.getByRole("button", {
      name: /continue with google/i,
    });

    await act(async () => {
      fireEvent.click(googleButton);
    });

    // Ensure googleLogin hook function was called
    expect(mockGoogleLoginFn).toHaveBeenCalled();

    // Ensure axios posted to backend with token
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining("/users/login/google/"),
      { access_token: "mock_token_123" },
      { withCredentials: true }
    );
  });

test("Google login backend failure displays backend error message", async () => {
  // Mock backend failure AFTER Google OAuth success
  axios.post.mockRejectedValueOnce({
    response: {
      data: { message: "Backend failure: email already exists" }
    }
  });

  render(<LoginForm />);

  const googleBtn = screen.getByRole("button", {
    name: /continue with google/i,
  });

  await act(async () => {
    fireEvent.click(googleBtn);
  });

  // Google login hook fired
  expect(mockGoogleLoginFn).toHaveBeenCalled();

  // Backend API attempted
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining("/users/login/google/"),
    { access_token: "mock_token_123" },
    { withCredentials: true }
  );

  // UI shows backend message
  expect(
    await screen.findByText("Backend failure: email already exists")
  ).toBeInTheDocument();
});

test("Google login onError sets error message", async () => {
  vi.resetModules();

  // Re-mock useGoogleLogin to force OAuth error
  vi.doMock("@react-oauth/google", () => ({
    useGoogleLogin: (config) => {
      return () => {
        mockGoogleLoginFn();
        config.onError(); // <-- simulate popup error
      };
    },
  }));

  const { default: LoginFormFresh } = await import(
    "../../src/components/LoginForm.jsx"
  );

  render(<LoginFormFresh />);

  const googleBtn = screen.getByRole("button", {
    name: /continue with google/i,
  });

  await act(async () => {
    fireEvent.click(googleBtn);
  });

  // googleLogin function was called
  expect(mockGoogleLoginFn).toHaveBeenCalled();

  // error message appears
  expect(
    await screen.findByText("Google login failed")
  ).toBeInTheDocument();

  expect(axios.post).not.toHaveBeenCalled();
  expect(mockNavigate).not.toHaveBeenCalled();
});

test("Google login loading stops when window regains focus", async () => {
  vi.useFakeTimers();
  vi.resetModules();

  // Re-mock google login to NOT trigger success or error (we only test focus)
  vi.doMock("@react-oauth/google", () => ({
    useGoogleLogin: () => () => {
      mockGoogleLoginFn(); // Google popup opened
      // do NOT call success or error
    },
  }));

  const { default: LoginFormFresh } = await import(
    "../../src/components/LoginForm.jsx"
  );

  render(<LoginFormFresh />);

  const googleBtn = screen.getByRole("button", {
    name: /continue with google/i,
  });

  // Click Google login → loading should become true
  await act(async () => {
    fireEvent.click(googleBtn);
  });

  // Loading spinner should appear
  expect(screen.getByText(/Processing/i)).toBeInTheDocument();

  // Simulate window regaining focus (popup closes)
  await act(async () => {
    window.dispatchEvent(new Event("focus"));
  });

  // Advance timeout (1000 ms)
  await act(async () => {
    vi.advanceTimersByTime(1000);
  });

  // Loading spinner removed
  expect(screen.queryByText(/Processing/i)).not.toBeInTheDocument();

  vi.useRealTimers();
});

test("Google login throw triggers catch block (popup failure)", async () => {
  vi.useFakeTimers();
  vi.resetModules();

  // Re-mock useGoogleLogin so the returned function THROWS
  vi.doMock("@react-oauth/google", () => ({
    useGoogleLogin: () => {
      return () => {
        throw new Error("Popup blocked");
      };
    },
  }));

  // Re-import component with fresh mock
  const { default: LoginFormFresh } = await import(
    "../../src/components/LoginForm.jsx"
  );

  render(<LoginFormFresh />);

  const googleBtn = screen.getByRole("button", {
    name: /continue with google/i,
  });

  // ---- CLICK GOOGLE BUTTON ----
  await act(async () => {
    fireEvent.click(googleBtn);
  });

  // ❗ assert loading turned OFF after catch
  expect(screen.queryByText(/Processing/i)).not.toBeInTheDocument();

  // ❗ optional: assert no crash happened
  expect(screen.queryByText("Google login failed")).not.toBeInTheDocument();

  vi.useRealTimers();
});

test("handleLogin success redirects to Dashboard and sets userLoggedIn", async () => {
  // Mock API success
  axios.post.mockResolvedValueOnce({
    data: { message: "Login success" }
  });

  render(<LoginForm />);

  const emailInput = screen.getByLabelText("Email");
  const passwordInput = screen.getByLabelText("Password");

  // Enter valid credentials
  fireEvent.change(emailInput, { target: { value: "user@example.com" } });
  fireEvent.change(passwordInput, { target: { value: "password123" } });

  const loginButton = screen.getByRole("button", { name: "Login" });

  // Click Login
  await act(async () => {
    fireEvent.click(loginButton);
  });

  // Backend should be called
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining("/users/login/"),
    { email: "user@example.com", password: "password123" },
    { withCredentials: true }
  );

  // Context function should be called
  expect(mockSetUserLoggedIn).toHaveBeenCalledWith(true);

  // Navigation should happen
  expect(mockNavigate).toHaveBeenCalledWith("/Dashboard");
});

test("handleSendOtpForForgotPassword handles backend error (catch block)", async () => {
  // Arrange → mock axios to REJECT request
  axios.post.mockRejectedValueOnce({
    response: { data: { message: "User not found" } }
  });

  render(<LoginForm />);

  const emailInput = screen.getByLabelText("Email");

  // Switch to forgot password mode
  fireEvent.click(screen.getByText("Forgot?"));

  // Enter a valid email
  fireEvent.change(emailInput, { target: { value: "missing@example.com" } });

  const sendOtpBtn = screen.getByRole("button", { name: /send otp/i });

  // Act → click Send OTP (this triggers handleSendOtpForForgotPassword)
  await act(async () => {
    fireEvent.click(sendOtpBtn);
  });

  // Assert: axios was called correctly
  expect(axios.post).toHaveBeenCalledWith(
    expect.stringContaining("/forgotPasswordOtpGeneration"),
    { email: "missing@example.com" },
    { withCredentials: true }
  );

  // UI shows backend error message
  expect(screen.getByText("User not found")).toBeInTheDocument();

  // forgotUserExists should be set FALSE → OTP input must NOT appear
  expect(screen.queryByLabelText("OTP")).not.toBeVisible();

  // Resend timer text should also NOT appear
  expect(screen.queryByText(/Resend in/i)).not.toBeInTheDocument();

  // Loading MUST be stopped
  expect(screen.queryByText(/Processing/i)).not.toBeInTheDocument();

  expect(screen.getByRole("button", { name: /send otp/i })).not.toBeDisabled();
});

test("OTP verification success sets flags and reset password works successfully", async () => {
  // 1️⃣ Mock SEND OTP success
  axios.post.mockResolvedValueOnce({
    data: { message: "OTP sent successfully" }
  });

  render(<LoginForm />);

  // Enter forgot password mode
  fireEvent.click(screen.getByText("Forgot?"));

  // Enter valid email
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "user@example.com" }
  });

  // Click SEND OTP
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /send otp/i }));
  });

  // OTP field visible
  expect(await screen.findByLabelText("OTP")).toBeInTheDocument();

  // 2️⃣ Mock OTP VERIFY success
  axios.post.mockResolvedValueOnce({
    data: { message: "OTP verified" }
  });

  // Enter OTP
  fireEvent.change(screen.getByLabelText("OTP"), {
    target: { value: "123456" }
  });

  // Click VERIFY OTP
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /verify otp/i }));
  });

  // Password field appears for new password
  const newPassInput = screen.getByLabelText("Password");
  expect(newPassInput).toBeInTheDocument();

  // 3️⃣ Mock RESET PASSWORD success
  axios.patch = vi.fn().mockResolvedValueOnce({
    data: { message: "Password reset successful" }
  });

  // Enter new password
  fireEvent.change(newPassInput, {
    target: { value: "NewPassword123@" }
  });

  // Click RESET PASSWORD
  const resetBtn = screen.getByRole("button", { name: /reset password/i });

  await act(async () => {
    fireEvent.click(resetBtn);
  });

  // Backend PATCH endpoint called correctly
  expect(axios.patch).toHaveBeenCalledWith(
    expect.stringContaining("/setNewPassword"),
    {
      email: "user@example.com",
      newPassword: "NewPassword123@"
    },
    { withCredentials: true }
  );

  // Should mark user logged in
  expect(mockSetUserLoggedIn).toHaveBeenCalledWith(true);

  // Should navigate to dashboard
  expect(mockNavigate).toHaveBeenCalledWith("/Dashboard");
});



test("OTP verification failure hits catch block and shows error message", async () => {
  // 1️⃣ Mock SEND OTP success
  axios.post.mockResolvedValueOnce({
    data: { message: "OTP sent" }
  });

  render(<LoginForm />);

  // Enter forgot password mode
  fireEvent.click(screen.getByText("Forgot?"));

  // Enter valid email
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "user@example.com" },
  });

  // Send OTP
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /send otp/i }));
  });

  // OTP input MUST appear (because forgotUserExists becomes true)
  expect(await screen.findByLabelText("OTP")).toBeInTheDocument();

  // 2️⃣ Mock VERIFY OTP FAILURE
  axios.post.mockRejectedValueOnce({
    response: { data: { message: "Invalid OTP" } }
  });

  // Enter OTP
  fireEvent.change(screen.getByLabelText("OTP"), {
    target: { value: "000000" },
  });

  // Click VERIFY OTP
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /verify otp/i }));
  });

  // 3️⃣ VERIFY catch block ran → error message displayed
  expect(await screen.findByText("Invalid OTP")).toBeInTheDocument();

  // 4️⃣ VERIFY UI does NOT proceed to reset password page
  expect(screen.queryByLabelText("newPassword")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: /verify otp/i })).toBeInTheDocument();
});

test("clicking 'Sign up' calls toggleForm, resets parent state and clears titleError", async () => {
  // Arrange: make login fail so titleError becomes non-empty
  axios.post.mockRejectedValueOnce({
    response: { data: { message: "Some login error" } }
  });

  const mockToggleForm = vi.fn();
  const mockParentReset = vi.fn();

  // Ensure we are in login mode (sessionStorage cleared in beforeEach)
  render(<LoginForm toggleForm={mockToggleForm} resetFormStates={mockParentReset} />);

  // Fill valid email + any password to enable Login button
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "user@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Password"), {
    target: { value: "abc" },
  });

  // Act: click Login to produce an error (sets titleError)
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: /login/i }));
  });

  // Confirm error displayed
  expect(await screen.findByText("Some login error")).toBeInTheDocument();

  // The "Sign up" anchor inside the paragraph should be visible (login mode)
  const signUpLink = screen.getByText("Sign up");
  expect(signUpLink).toBeInTheDocument();

  // Click the Sign up link
  fireEvent.click(signUpLink);

  // Assert toggleForm and parent reset were called
  expect(mockToggleForm).toHaveBeenCalled();
  expect(mockParentReset).toHaveBeenCalled();

  // titleError should be cleared by setTitleError("") invoked inside click handler
  expect(screen.queryByText("Some login error")).not.toBeInTheDocument();
});


});