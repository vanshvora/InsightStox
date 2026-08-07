import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useGoogleLogin } from "@react-oauth/google";
import google_logo from "../assets/google_logo.svg";
import InputField from "./InputField.jsx";
import PasswordInputField from "./PasswordInputField.jsx";
import  {checkPasswordStrength,validateEmail,} from "../utils/validation.js";
import { useAppContext } from "../context/AppContext.jsx";
import LogoDark from "../assets/LogoDark.png";
import Swal from "sweetalert2";
import "./alert.css";
const LoginForm = ({ toggleForm, resetFormStates: parentResetFormStates }) => {
/*----------------------------------- State Variables-----------------------------------------------------------*/
    const navigate = useNavigate();
    const [isForgotPassword, setIsForgotPassword] = useState(() => {
      return sessionStorage.getItem("forgotpassword") === "true";
    });
   
    const [isOtpSubmitted, setIsOtpSubmitted] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [otp, setOtp] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [titleError, setTitleError] = useState("");
    const [areAllFieldsValid, setAreAllFieldsValid] = useState(false);
    const [timer, setTimer] = useState(30);
    const [forgotUserExists, setForgotUserExists] = useState(false);
    const [forgotOtpvarified, setForgotOtpvarified] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [newPasswordError, setNewPasswordError] = useState("");
    const [resetPassword, setResetPassword] = useState(false);
    const [googleLoginLoading, setGoogleLoginLoading] = useState(false);
    axios.defaults.withCredentials = true;
    const {userLoggedIn, setUserLoggedIn} = useAppContext();
/*----------------------------------- Functions----------------------------------------------------------------- */
    
// Function to toggle forgot password state and update sessionStorage
    const toggleForgotPassword = () => {
      setIsForgotPassword(prev => {
        const newVal = !prev;
        sessionStorage.setItem("forgotpassword", newVal); // update sessionStorage
        return newVal;
      });
    };
    // Function to reset form states
    const handleForgotPasswordInputToggle = (email) => {
          setIsOtpSubmitted(!isOtpSubmitted);
      };
      //function to reset all form states
    function resetFormStates(){
        setEmail("");
        setPassword("");
        setOtp("");
        setPasswordError("");
        setEmailError("");
        setTitleError("");
        setIsOtpSubmitted(false);
        setForgotUserExists(false);
        setForgotOtpvarified(false);
        setresetPassword(false);
        setForgotOtpvarified(false);
        setNewPassword("");
        setNewPasswordError("");
        setTimer(30);
        // Also call parent reset
        if (parentResetFormStates) parentResetFormStates();
    }
/*-----------------------------------Google login handlers----------------------------------------------------------- */

// Function to handle Google login
      const handleGoogleLogin = async (tokenResponse) => {
        try{
          const res = await axios.post(import.meta.env.VITE_BACKEND_LINK + "/users/login/google/", {
            access_token: tokenResponse.access_token},
            {withCredentials: true
          });
          Swal.fire({
  toast: true,
  position: "top",
  icon: "success",
  title: "Login Successful!",
  background: "linear-gradient(135deg, #0f0f0f, #003f2f)",
  iconColor: "#2dff88",
  color: "#b4ffd9",
  showConfirmButton: false,
  timer: 2800,
  customClass: { popup: "toast-login-success" }
});

          setUserLoggedIn(true);
          navigate("/Dashboard");
        }catch(err){  
          console.log("Google login error:", err.response?.data?.message || err.message);
          if(err.response?.data?.message)
            setTitleError(err.response.data.message);
        }finally {
          setGoogleLoginLoading(false);
        }
      }
    
      // Google login hook
      const googleLogin = useGoogleLogin({
        onSuccess: (tokenResponse) => handleGoogleLogin(tokenResponse),
        onError: () => {
          setTitleError('Google login failed');
        }
      });

      const handleGoogleButtonClick = () => {
        setGoogleLoginLoading(true);

        // Detect when window regains focus after popup closes
        const handleFocusBack = () => {
          setTimeout(() => {
            setGoogleLoginLoading(false);
          }, 1000);
          window.removeEventListener("focus", handleFocusBack);
        };

        window.addEventListener("focus", handleFocusBack);

        try {
          googleLogin();
        } catch (error) {
          console.log("Google popup failed:", error);
          setGoogleLoginLoading(false);
          window.removeEventListener("focus", handleFocusBack);
        }
      };
/*----------------------------------- login handlers-------------------------------------------------------------------------- */
// Function to handle login
    const handleLogin = async () => {
        setIsLoading(true);
        try {
            const res = await axios.post(import.meta.env.VITE_BACKEND_LINK+"/users/login/", {email : email.trim(), password : password.trim()}, {withCredentials: true});
            console.log("✅ Logged in successfully:", res.data);
            setUserLoggedIn(true);
            Swal.fire({
  toast: true,
  position: "top",
  icon: "success",
  title: "Login Successful!",
  background: "linear-gradient(135deg, #0f0f0f, #003f2f)",
  iconColor: "#2dff88",
  color: "#b4ffd9",
  showConfirmButton: false,
  timer: 2800,
  customClass: { popup: "toast-login-success" }
});

            navigate("/Dashboard");
        } catch (err) {
            if(err.response.data.message)
                setTitleError(err.response.data.message);
            console.error("❌ Login error:", err.response.data.message);
        }finally {
            setIsLoading(false);
        }
    }

/*----------------------------------- Forgot password handlers------------------------------------------------------------------- */
// Function to handle sending OTP for forgot password
const handleSendOtpForForgotPassword = async () => {
  
  try{
    const res = await axios.post(import.meta.env.VITE_BACKEND_LINK+"/users/password/forgot/otp/", {email : email.trim()}, {withCredentials: true});
    Swal.fire({
  toast: true,
  position: "top",
  icon: "info",
  title: "OTP Sent to your email",
  background: "#0a0f26",
  iconColor: "#5ab3ff",
  color: "#a5d4ff",
  showConfirmButton: false,
  timer: 2800,
  customClass: { popup: "toast-otp-sent" }
});
    console.log("✅ OTP sent successfully:", res.data);
    setForgotUserExists(true);
    setTimer(30);
  }catch(err){
    setTitleError(err.response.data.message);
    setForgotUserExists(false);
    console.error("❌ OTP send error:", err.response.data.message);
  }finally{
    setIsLoading(false);
  }
};

// Function to handle OTP verification for forgot password
const handleOtpverificationForForgotPassword = async () => {
    setIsLoading(true);
try{
  const res = await axios.post(import.meta.env.VITE_BACKEND_LINK+"/users/password/forgot/verify/", {email : email.trim(), otp: otp.trim()}, {withCredentials: true});
    Swal.fire({
  toast: true,
  position: "top",
  icon: "success",
  title: "OTP Verified Successfully!",
  background: "rgba(0, 20, 0, 0.75)",   // dark neon base
  iconColor: "#6aff7a",                // neon mint icon
  color: "#b8ffcf",                    // soft mint text
  showConfirmButton: false,
  timer: 2800,
  customClass: { popup: "toast-otp-verified" }
});

   console.log("✅ OTP verified successfully:", res.data.message);
  setForgotOtpvarified(true);
  setResetPassword(true);
} catch(err) {
   setTitleError(err.response.data.message);
     console.error("❌ OTP verification error:", err.response.data.message);
}finally{
    setIsLoading(false);
}
};

// Function to handle resetting password
const handleResetPassword = async () => {
    setIsLoading(true);
    try{
        const res = await axios.patch(import.meta.env.VITE_BACKEND_LINK+"/users/password/forgot/reset/", {email : email.trim(), newPassword : newPassword.trim()}, {withCredentials: true});
        Swal.fire({
  toast: true,
  position: "top",
  icon: "success",
  title: "Password Reset Successful",
  text: "Redirecting to dashboard...",
  background: "#101010",
  iconColor: "#32ff8a",
  color: "#b2ffd9",
  showConfirmButton: false,
  timer: 2800,
  customClass: { popup: "toast-reset-to-dashboard" }
});

        console.log("✅ Password reset successful:", res.data);
        
        setUserLoggedIn(true);
        navigate("/Dashboard");
    } catch (err) {
      if(err.response.data.message){
        setTitleError(err.response.data.message);
        console.error("❌ Password reset error:", err.response.data.message);
      }
    }finally {
      setIsLoading(false);
    }
  };

/*----------------------------------- Use Effects ------------------------------------------------------------*/
  //useEffect for enabling/disabling submit button
useEffect(() => {
    if(isForgotPassword){
      setAreAllFieldsValid(email.trim() !== "" && emailError==="");
    }else{
        const isValid = email.trim() !== "" && password.trim() !== "" && emailError === "";
        setAreAllFieldsValid(isValid);
    }
  }, [email, password, emailError, isForgotPassword]);

    //useEffect for newpassword error message validation
useEffect(() => {
    if (newPassword.trim() === "") {
          setNewPasswordError(""); // default message
        } else {
          setNewPasswordError(checkPasswordStrength(newPassword.trim()));
        }
    }, [newPassword]);

    //useEffect for password error message validation
useEffect(() => {
    if (password.trim()==="") {
      setPasswordError(""); // default message
    } else {
      setPasswordError(checkPasswordStrength(password.trim()));
    }
   }, [password]);

   //useEffect for email error message validation
useEffect(() => {
    const trimmedEmail = email.trim();
    if (trimmedEmail && !validateEmail(trimmedEmail)) {
      setEmailError("Invalid email format");
   } else {
      setEmailError("");
   }
  }, [email]);

  //useEffect for OTP resend timer
useEffect(() => {
      if(timer <= 0)return;
    const interval = setInterval(() => {
        setTimer((prevTimer) => prevTimer - 1);
      }, 1000);

      return () => clearInterval(interval);
    }, [timer]);
/*----------------------------------- JSX --------------------------------------------------------------------- */
// Handle Enter key: submit only when fields are valid for the current flow
const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    if (isForgotPassword) {
      // If not yet requested OTP -> send OTP (requires valid email)
      if (!isOtpSubmitted) {
        if (email.trim() === "" || emailError) return;
        setTitleError("");
        handleForgotPasswordInputToggle(email);
        handleSendOtpForForgotPassword();
        return;
      }

      // OTP submitted and user exists -> verify OTP (requires OTP)
      if (isOtpSubmitted && forgotUserExists && !forgotOtpvarified) {
        if (otp.trim() === "") return;
        setTitleError("");
        handleOtpverificationForForgotPassword();
        return;
      }

      // If OTP verified -> reset password (requires new password valid)
      if (forgotOtpvarified) {
        if (newPasswordError !== "") return;
        handleResetPassword();
        return;
      }
    } else {
      // Normal login flow: require both email and password valid
      if (!areAllFieldsValid) return;
      handleLogin();
    }
};

return (
        <>

        {/* Logo */}
          <div className="authlogo">
            <img src={LogoDark} alt="Dark Mode Logo" />
          </div>

          {/* Title text */}
          <div className="title-text">
            <h1>{isForgotPassword ? 'Reset your password' : 'Login to your account'}</h1>
          </div>

          {/* Login and Forgot password field */}
          <form className="form" style={{gap : isForgotPassword ? '0.5rem' : '0rem' }} onSubmit={(e)=>e.preventDefault()} onKeyDown={handleKeyDown}>
            {/* Email Field */}
            <InputField htmlFor="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} id="email" placeholder="Enter your email" labelVal="Email" styleVal={{ display: forgotUserExists ? 'none':'block' }}/>
            <p className="email-error error" style={{ display: isOtpSubmitted && forgotUserExists ? 'none' : 'block' }}>{emailError}</p>
            <div className="forgot-password" >
                <a onClick={() => {toggleForgotPassword();resetFormStates();}} style={{display: isForgotPassword ? 'none' : 'block'}} >Forgot?</a>
            </div>

            {/* Password Field */}
            <PasswordInputField htmlFor={forgotOtpvarified ? "newPassword" : "password"} type="password" value={forgotOtpvarified ? newPassword : password}  onChange={(e) => forgotOtpvarified ? setNewPassword(e.target.value) : setPassword(e.target.value)} id={forgotOtpvarified ? 'newPassword' : 'password'}  placeholder={forgotOtpvarified ?"Enter your newPassword" : "Enter your password"} labelVal="Password" styleVal={{display: (isForgotPassword && !forgotOtpvarified) ? 'none' : 'block'}}/>
            
            {/* OTP Field */}
            <InputField htmlFor="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} id="otp" placeholder="Enter the OTP" labelVal="OTP" styleVal={{ display: isOtpSubmitted && forgotUserExists && !forgotOtpvarified ? 'block' : 'none' }} />

            {/* Buttons */}
            {/* Login Button */}
            {!isForgotPassword && (<button type="button" disabled={!areAllFieldsValid} className="submit loading" style={{display:'flex', opacity: areAllFieldsValid ? 1 : 0.5, cursor: areAllFieldsValid ? 'pointer' : 'not-allowed'}} onClick={() => {handleLogin()}}>{isLoading ? <><i className="pi pi-spin pi-spinner spin"></i><span>Processing...</span></> : "Login"}</button>)}
            
            {/*Send/verify OTP */}
            {isForgotPassword && !forgotOtpvarified && (<button type="button" disabled={!areAllFieldsValid} className="submit loading" style={{display: 'flex', opacity: areAllFieldsValid ? 1 : 0.5, cursor: areAllFieldsValid ? 'pointer' : 'not-allowed'}}  onClick= {()=>{setTitleError(""); if(isOtpSubmitted && forgotUserExists ){handleOtpverificationForForgotPassword() } else { handleForgotPasswordInputToggle(email);handleSendOtpForForgotPassword();}}}>{isLoading ? <><i className="pi pi-spin pi-spinner spin"></i><span>Processing...</span></> : <>{isOtpSubmitted && forgotUserExists ? 'Verify OTP' : 'Send OTP'}</>}</button>)}

            {/* New Password Error Message */}
            {resetPassword && forgotOtpvarified && <p style={{ display : "block" }} className="pass-error error">{newPasswordError}</p>}

            {/* Resend OTP Button */}
            {isOtpSubmitted && forgotUserExists && !forgotOtpvarified && (<button type="button" className="resubmit" disabled = {timer!==0} style = {{opacity: timer===0 ? 1 : 0.5, cursor: timer===0 ? 'pointer' : 'not-allowed',display: "block"}} onClick={() => { setTitleError("");handleSendOtpForForgotPassword();}}>Resend</button>)}

            {/* Reset Password Button */}
            {forgotOtpvarified && (<button type="button" className="resubmit resetpass loading" disabled = {newPasswordError!=="" || newPassword.length===0 } style={{display: "flex",opacity: newPasswordError!=="" || newPassword.length===0 ? 0.5 : 1,cursor: newPasswordError!=="" || newPassword.length===0 ? 'not-allowed' : 'pointer'}} onClick={() => {handleResetPassword();}}>{isLoading ?<><i className="pi pi-spin pi-spinner spin"></i><span>Processing...</span></> : "Reset Password"}</button>)}

            {/* Google Login Button */}
            {!isForgotPassword && (<button type="button" className="google-btn loading" onClick = {()=>{handleGoogleButtonClick();}} style={{display: "flex"}} >
                {googleLoginLoading ?<><i className="pi pi-spin pi-spinner spin"></i><span>Processing...</span></> : <><img src={google_logo} alt="Google logo" className="google-logo" />
                <span>Continue with Google</span></>}
            </button>)}

            {/* Auth Links */}
            <p className="auth-text" style={{display: isForgotPassword ? 'none' : 'block'}}>Don't have an account ?<a onClick={() => {toggleForm();setTitleError("");resetFormStates()}} style={{ cursor: 'pointer' }}>Sign up</a></p>
            {isForgotPassword && (<p className="auth-text">Remembered your password ?<a onClick={()=>{toggleForgotPassword();setTitleError("");resetFormStates()}} style={{ cursor: 'pointer' }}>Login</a></p>)}
            
            {/* OTP Timer */}
            {isOtpSubmitted && forgotUserExists && !forgotOtpvarified && (<p className="text-center" style={{ display: 'block' }}>{`Didn’t receive the OTP? Resend in ${timer}s`}</p>)}

            {/* Global error message */}
            <p className="title-error">{titleError}</p>
          </form>
        </>
);
};

export default LoginForm;