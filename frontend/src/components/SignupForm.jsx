// import all relavent modules and components
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import InputField from "./InputField.jsx";
import PasswordInputField from "./PasswordInputField.jsx";
import  {checkPasswordStrength,validateEmail,validateNameStrength} from "../utils/validation.js";
import { useAppContext } from "../context/AppContext.jsx"
import { useQueryClient } from "@tanstack/react-query";
import { clearUserCache } from "../utils/clearUserCache.js";
import LogoDark from "../assets/LogoDark.png";
import Swal from "sweetalert2";
import "./alert.css";
const SignupForm = ({ toggleForm, resetFormStates: parentResetFormStates }) => {
/*----------------------------------- State Variables----------------------------------------------------------- */
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [otp, setOtp] = useState("");
    const [isOtpSent, setIsOtpSent] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [confirmPassword, setConfirmPassword] = useState("");
    const [nameError, setNameError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [emailError, setEmailError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [titleError, setTitleError] = useState("");
    const [areAllFieldsValid, setAreAllFieldsValid] = useState(false);
    const [timer, setTimer] = useState(30);
    axios.defaults.withCredentials = true;
    const {setUserLoggedIn} = useAppContext();
    const [privacyPolicy, setPrivacyPolicy] = useState(false)
    const [privacyPopup,setPrivacyPopup] =useState(false)

/*----------------------------------- Functions--------------------------------------------------------------- */
// Function to reset all form states
    function resetFormStates(){
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setName("");
    setOtp("");
    setNameError("");
    setPasswordError("");
    setEmailError("");
    setConfirmPasswordError("");
    setTitleError("");
    setPrivacyPolicy(false);
    setIsOtpSent(false);
    // Also call parent reset
    if (parentResetFormStates) parentResetFormStates();
  }



/*----------------------------------- Registration handlers-----------------------------------------------------------------------*/
// Function to handle OTP generation
const handleOtpGeneration = async () => {
    setIsLoading(true);
    setAreAllFieldsValid(false);
    try {
        const res = await axios.post(import.meta.env.VITE_BACKEND_LINK+"/users/register/otp/", {email : email.trim(), name: name.trim(), password : password.trim()}, {withCredentials: true});
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
        console.log("✅ OTP generation successful:", res.data);

        setAreAllFieldsValid(true);
        setIsOtpSent((prev)=>!prev);
        setTimer(30);
    } catch (err) {
      if(err.response.data.message)
        setTitleError(err.response.data.message);
        console.error("❌ OTP generation error:", err.response.data.message);
    }finally{
        setIsLoading(false);
    }
  };

// Function to handle OTP resend
  const handleResendOtpGeneration = async () => {
    // setIsLoading(true);
    try {
        const res = await axios.post(import.meta.env.VITE_BACKEND_LINK+"/users/register/otp/", {email : email.trim(), name: name.trim(), password : password.trim()}, {withCredentials: true});
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
         console.log("✅ OTP resend successful:", res.data);
        setTimer(30);
    } catch (err) {
       console.log("❌ OTP resend error:", err.response.data.message);
       setTitleError(err.response.data.message);
    }finally{
        setIsLoading(false);
    }
  };

// Function to handle user registration
const handleRegister = async () => {
    setIsLoading(true);
   try {
    const res = await axios.post(import.meta.env.VITE_BACKEND_LINK+"/users/register/", {email : email.trim(), otp: otp.trim()}, {withCredentials: true});
    console.log("✅ Registered successfully:", res.data);
    Swal.fire({
      toast: true,
      position: "top",
      icon: "success",
      title: "Registered Successfully!",
      background: "linear-gradient(135deg, #0f0f0f, #003f2f)",
      iconColor: "#2dff88",
      color: "#b4ffd9",
      showConfirmButton: false,
      timer: 2800,
      customClass: { popup: "toast-login-success" }
    });
    
    setIsOtpSent((prev)=>!prev);
    setUserLoggedIn(true);
    clearUserCache(queryClient);
    navigate("/dashboard");
    } catch (err) {
          setTitleError(err.response.data.message);
        
        console.log("❌ Register error:", err.response.data.message);
    } finally {
        setIsLoading(false);
    }
};
/*----------------------------------- useEffect Hooks---------------------------------------------------------- */

//useEffect for validating all fields
useEffect(() => {
    if(isOtpSent)
    {
      setTitleError("");  
      setAreAllFieldsValid(otp.trim() !== "");
    }
    else
    {
        const allValid = email.trim() !== "" && password.trim() !== "" && name.trim() !== "" && confirmPassword.trim() !== "" && password.trim() === confirmPassword.trim() && passwordError === "" && nameError === "" && emailError === "" &&privacyPolicy;
        setAreAllFieldsValid(allValid)
    }
  }, [email, password, name, confirmPassword, passwordError, nameError, emailError, otp, isOtpSent,privacyPolicy]);
  
  //useEffect for error message validation
  useEffect(() => {
      if (name.trim() && !validateNameStrength(name.trim())) {
        setNameError("Name should not contain numbers or special characters");
      } else {
        setNameError("");
      }
    }, [name]);

    //useEffect for password error message validation
useEffect(() => {
        if (!password.trim()) {
+          setPasswordError(""); // default message
        } else {
          setPasswordError(checkPasswordStrength(password.trim()));
        }
       }, [password]);
    
    //useEffect for confirm password error message validation
useEffect(() => {
    if (password.trim() && confirmPassword.trim() && password.trim() !== confirmPassword.trim()) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
   }, [confirmPassword, password]);

   //useEffect for email error message validation
useEffect(() => {
    if (email.trim() && !validateEmail(email.trim())) {
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
  
  // Handle Enter key: submit only when fields are valid for current flow
  const handleKeyDown = (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();

    if (isOtpSent) {
      if (otp.trim() === "") return;
      setTitleError("");
      handleRegister();
      return;
    }

    // If not OTP flow, trigger OTP generation only when all fields valid
    if (!areAllFieldsValid) return;
    setTitleError("");
    handleOtpGeneration();
  };

/*----------------------------------- JSX --------------------------------------------------------------------- */
    return (
        <>
        {/* SignUp logo */}
          <div className="signuplogo">
            <img src={LogoDark} alt="Dark Mode Logo" />
          </div>
        
        {/* Title Text */}
          <div className="title-text">
            <h1>{isOtpSent ? 'Check your email for the OTP' : 'Create your account'}</h1>
          </div>
        
        {/* SignUp form Division */}
      <form className="form" style={{ gap: isOtpSent ? '0.3rem' : '0rem' }} onSubmit={(e)=>{e.preventDefault();}} onKeyDown={handleKeyDown}>
          {/* Input Fields for Name */}
        <InputField htmlFor="name" type="text" value={name} onChange={(e) => setName(e.target.value)} id="name" placeholder="Enter your full name" labelVal="Full Name" styleVal={{ display: isOtpSent ? 'none' : 'block' }} />
          <p style={{ display: isOtpSent ? 'none' : 'block' }} className="name-error error">{nameError}</p>

          {/* Input Fields for Email */}
        <InputField htmlFor="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} id="email" placeholder="Enter your email" labelVal="Email" styleVal={{ display: isOtpSent ? 'none' : 'block' }} />
          <p style={{ display: isOtpSent ? 'none' : 'block' }} className="email-error error">{emailError}</p>

          {/* Input Fields for Password */}
        <PasswordInputField htmlFor="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} id="password" placeholder="Enter your password" labelVal="Password" styleVal={{ display: isOtpSent ? 'none' : 'block' }} />
          <p style={{ display: isOtpSent ? 'none' : 'block' }} className="pass-error error">{passwordError}</p>

          {/* Input Fields for Confirm Password */}
        <PasswordInputField htmlFor="confirmPassword" type="password" value={confirmPassword} onPaste={(e) => e.preventDefault()} onChange={(e) => setConfirmPassword(e.target.value)} id="confirmPassword" placeholder="Confirm your password" labelVal="Confirm Password" styleVal={{ display: isOtpSent ? 'none' : 'block' }} />
          <p style={{ display: isOtpSent ? 'none' : 'block' }} className="confirm-pass-error error">{confirmPasswordError}</p>

        {/* Input Fields for OTP */}
        <InputField htmlFor="otp" type="text" value={otp} onChange={(e) => setOtp(e.target.value)} id="otp" placeholder="Enter the OTP" labelVal="OTP" styleVal={{ display: isOtpSent ? 'block' : 'none' }} />

        <p style={{ display: isOtpSent ? 'none' : 'flex' }} className="privacy-policy"><input type="checkbox" checked={privacyPolicy} onChange={(e) => setPrivacyPolicy(e.target.checked)} />I have read and agree to the<a className="policy-link" onClick={()=>{setPrivacyPopup(true);}}>privacy policy</a></p>

        {/* Submit and Resend Buttons */}
        <button type="button" disabled={!areAllFieldsValid} className="submit loading" style = {{opacity: areAllFieldsValid ? 1 : 0.5, cursor: areAllFieldsValid ? 'pointer' : 'not-allowed'}} onClick={() => {setTitleError(""); (isOtpSent ? handleRegister() : handleOtpGeneration()); }}>{isLoading ? <><i className="pi pi-spin pi-spinner spin"></i><span>Processing...</span></> : <>{isOtpSent ? 'Verify OTP' : 'Sign Up'}</>}</button>
        <button type="button" className="resubmit" disabled = {timer!==0} style = {{opacity: timer===0 ? 1 : 0.5, cursor: timer===0 ? 'pointer' : 'not-allowed',display: isOtpSent ? 'block' : 'none'}} onClick={() => {setTitleError("");handleResendOtpGeneration();}}>Resend</button>

        {/* Toggle to Login Form */}
        <p className="auth-text">Already have an account ?<a onClick={() => {toggleForm();setTitleError("");resetFormStates();}} style={{ cursor: 'pointer' }}>Login</a></p>
        <p className="text-center" style={{display : isOtpSent ? 'block' : 'none'}}>{`Didn't receive the OTP? Resend in ${timer}s`}</p>
        <p className="title-error">{titleError}</p>
      </form>

        {/* Privacy Policy Popup */}
         {privacyPopup && (<div className="privacy-popup-overlay" onClick={() => setPrivacyPopup(false)}></div> )}
        {privacyPopup && (
          
            <div className="privacy-popup-content" onClick={(e) => e.stopPropagation()}>
              <div className="privacy-popup-header">
                <h2>Privacy Policy</h2>
                <button className="privacy-close-btn" onClick={() => setPrivacyPopup(false)}>
                  <i className="pi pi-times"></i>
                </button>
              </div>
              <div className="privacy-popup-body">
                <section>
                  <h3>1. Information We Collect</h3>
                  <p>We collect information you provide directly to us, including your name, email address, and portfolio data. This information is used to provide and improve our services.</p>
                </section>
                
                <section>
                  <h3>2. How We Use Your Information</h3>
                  <p>Your information is used to:</p>
                  <ul>
                    <li>Provide personalized portfolio analysis and insights</li>
                    <li>Send important account notifications and updates</li>
                    <li>Improve our platform and develop new features</li>
                    <li>Ensure security and prevent fraud</li>
                  </ul>
                </section>
                
                <section>
                  <h3>3. Data Security</h3>
                  <p>We implement industry-standard security measures to protect your personal information. Your data is encrypted both in transit and at rest, and we regularly update our security protocols.</p>
                </section>
                
                <section>
                  <h3>4. Information Sharing</h3>
                  <p>We do not sell, trade, or rent your personal information to third parties. We may share data with trusted service providers who assist in operating our platform, under strict confidentiality agreements.</p>
                </section>
                
                <section>
                  <h3>5. Your Rights</h3>
                  <p>You have the right to:</p>
                  <ul>
                    <li>Access and review your personal data</li>
                    <li>Request corrections to your information</li>
                    <li>Delete your account and associated data</li>
                    <li>Opt-out of marketing communications</li>
                  </ul>
                </section>
                
                <section>
                  <h3>6. Cookies and Tracking</h3>
                  <p>We use cookies and similar technologies to enhance your experience, analyze usage patterns, and maintain your session. You can control cookie preferences through your browser settings.</p>
                </section>
                
                <section>
                  <h3>7. Updates to This Policy</h3>
                  <p>We may update this privacy policy from time to time. We will notify you of any significant changes via email or through our platform.</p>
                </section>
                
                <section>
                  <h3>8. Contact Us</h3>
                  <p>If you have any questions about this privacy policy or your personal data, please contact us through our support page.</p>
                </section>
              </div>
              <div className="privacy-popup-footer">
                <button className="privacy-accept-btn" onClick={() => {setPrivacyPolicy(true); setPrivacyPopup(false);}}>Accept & Close</button>
              </div>
            
            </div>
        )}
        </>
      );    
};

export default SignupForm;
