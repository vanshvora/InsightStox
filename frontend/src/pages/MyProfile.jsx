import React, { useState, useRef, useEffect } from "react";
import {useNavigate} from 'react-router-dom';
import axios from "axios";
import "../pages/MyProfile.css";
import "primeicons/primeicons.css";
import { MyProfileHandlers } from "../utils/MyProfileHandlers.jsx";
import { validateNameStrength, checkPasswordStrength } from "../utils/validation.js";
import Navbar from "../components/Navbar.jsx";
import profileImg from "../assets/profileicon.svg";
import GoToArrow from "../assets/routeicon.svg";
import GoogleLogo from "../assets/google_logo.svg";
import Footer from '../components/Footer.jsx';
import { Sidebar } from "../components/Sidebar.jsx";
import { useAppContext } from "../context/AppContext";

export const MyProfile = () => {
    const { darkMode, setDarkMode, userDetails, setUserDetails, ensureAuth, setChangeInProfile } = useAppContext();
    const fileInputRef = useRef(null);
    const [isEditingInfo, setIsEditingInfo] = useState(false);
    const [isEditingPass, setIsEditingPass] = useState(false);
    const [editedName, setEditedName] = useState("");
    const [currPass, setCurrPass] = useState("");
    const [newPass, setNewPass] = useState("");
    const [confirmPass, setConfirmPass] = useState("");
    const [showPassword1, setShowPassword1] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);
    const [showPassword3, setShowPassword3] = useState(false);
    const [nameError, setNameError] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmPasswordError, setConfirmPasswordError] = useState("");
    const [showOtpModal, setShowOtpModal] = useState(false);
    const [otp, setOtp] = useState("");
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
    const [resendCountdown, setResendCountdown] = useState(0);
    const navigate = useNavigate();
    const { handlePicChange, handleSaveName, handleSavePass, resendOtp,
        verifyOtpAndReset, handleFinGoals, handleInvExp, handleInvHorizon, handleRiskProf } = MyProfileHandlers(
            {
                setChangeInProfile, setUserDetails, setIsEditingInfo, editedName, resendCountdown,
                currPass, newPass, confirmPass, setIsSendingOtp, setOtp, setResendCountdown,
                setIsVerifyingOtp, setConfirmPass, setCurrPass, setNewPass, setShowOtpModal, otp, setIsEditingPass
            });

    axios.defaults.withCredentials = true;

    useEffect(() => {
        // Run an initial check: this page is an auth/home page, so pass true
        (async () => {
            try {
                await ensureAuth(navigate, false);
            } catch (e) {
                console.error("ensureAuth initial check failed:", e);
            }
        })();

        const intervalId = setInterval(() => {
            ensureAuth(navigate, false).catch((e) => console.error(e));
        }, 10000);

        return () => {
            clearInterval(intervalId);
        };
    }, [navigate, ensureAuth]);

    useEffect(() => {
        const onEsc = (e) => {
            if (e.key === 'Escape') {
                setIsEditingInfo(false);
                setIsEditingPass(false);
            }
        };

        window.addEventListener('keydown', onEsc);

        return () => window.removeEventListener('keydown', onEsc);
    }, []);

    useEffect(() => {
        const trimmedName = editedName.trim();
        if (trimmedName && !validateNameStrength(trimmedName)) {
            setNameError("Name should not contain numbers or special characters");
        } else {
            setNameError("");
        }
    }, [editedName]);

    useEffect(() => {
        const trimmedPassword = newPass.trim();
        if (trimmedPassword) {
            setPasswordError(checkPasswordStrength(trimmedPassword));
        } else {
            setPasswordError("");
        }
    }, [newPass]);

    useEffect(() => {
        if (newPass && confirmPass && newPass !== confirmPass) {
            setConfirmPasswordError("Passwords do not match");
        } else {
            setConfirmPasswordError("");
        }
    }, [confirmPass, newPass]);


    const handleButtonClick = () => fileInputRef.current.click();

    const handleEditInfo = () => {
        setEditedName(userDetails?.name);
        setIsEditingInfo(true);
    };
    const handleCancelInfo = () => setIsEditingInfo(false);

    const handleEditPass = () => setIsEditingPass(true);

    const handleCancelPass = () => {
        setIsEditingPass(false);
        setCurrPass("");
        setNewPass("");
        setConfirmPass("");
    }

    useEffect(() => {
        let timer = null;
        if (resendCountdown > 0) {
            timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
        }
        return () => clearTimeout(timer);
    }, [resendCountdown]);

    function checkCountdown() {
        if (resendCountdown > 0) {
            return `Resend (${resendCountdown}s)`;
        }
        else {
            return isSendingOtp ? "Sending..." : "Resend";
        }
    }

    return (
        <div className="myPage">
            <Navbar darkMode={darkMode} setDarkMode={setDarkMode} pageType="my-profile" 
            profileData={{name: userDetails?.name?.split(" ")[0] || "Guest",email: userDetails?.email || "N/A"}}/>

            <div className="myPage_Container">

                <Sidebar primaryData={{ name: userDetails?.name, email: userDetails?.email, profileImage: userDetails?.profileImage }} />

                <div className="myPage_MainContent">
                    <h2 className="myPage_PersProfile"> Your personal profile </h2>
                    <div className="myPage_ProfilePic">
                        <label>Profile photo</label>
                        <div className="myPage_PicSection">
                            <img className="myPage_PicPlaceholder" src={userDetails?.profileImage ? userDetails?.profileImage : profileImg} alt="Profile Pic" />
                            <input type="file" ref={fileInputRef} accept="image/*" style={{ display: "none" }} onChange={handlePicChange} />
                            <button className="myPage_ChangePhoto" value="Change Photo" onClick={handleButtonClick}>Change Photo</button>
                        </div>
                    </div>

                    <div className="myPage_Information">
                        {/* to be changed via checking the condition */}
                        <div className="myPage_InfRow1">
                            <div className="myPage_InfHeader">
                                <label>
                                    Name
                                </label>
                                {!isEditingInfo && <button className="myPage_EditDetails" value="Edit" onClick={handleEditInfo}>Edit</button>}
                            </div>

                            <div className="myPage_InfValue">
                                {isEditingInfo ? (
                                    <div className="myPage_nameWrap">
                                        <input
                                            type="text"
                                            value={editedName}
                                            onChange={(e) => setEditedName(e.target.value)}
                                        />
                                        <p style={{ display: editedName ? 'block' : 'none' }} className="myPage_name-error error">{nameError}</p>
                                    </div>
                                ) : (
                                    <span>{userDetails?.name}</span>
                                )}
                            </div>
                        </div>

                        {isEditingInfo && (
                            <div className="myPage_SaveCancelBtns">
                                <button className="myPage_SaveBtn" value="Save Changes" onClick={handleSaveName}>Save changes</button>
                                <button className="myPage_CancelBtn" value="Cancel" onClick={handleCancelInfo}>Cancel</button>
                            </div>
                        )}
                        <hr />

                        <div className="myPage_InfRow2">
                            <label>Email address</label>
                            <div className="myPage_InfValue">
                                <span>{userDetails?.email}</span>
                            </div>
                        </div>
                        <hr />

                        {/* to be changed via checking the condition */}

                        <div className="myPage_InfRow5">
                            <div className="myPage_InfHeader">
                                <label>
                                    Password
                                </label>
                                {!isEditingPass && userDetails?.registrationMethod === "email" && <button className="myPage_EditDetails" value="Edit" onClick={handleEditPass}> Edit </button>}
                            </div>

                            <div className="myPage_InfValue">
                                {isEditingPass ? (
                                    <div className="myPage_Handler">
                                        <div className="myPage_PasswordEditFields">
                                            <div className="myPage_CurrPass">
                                                <input
                                                    type={showPassword1 ? "text" : "password"}
                                                    placeholder="Current password"
                                                    value={currPass}
                                                    onChange={(e) => setCurrPass(e.target.value)}
                                                />
                                                <button className="myPage_password-toggle1" data-testid="myPage_password-toggle1" onClick={() => setShowPassword1(!showPassword1)}>
                                                    <span className="myPage_eye-symbol">
                                                        <i className={`pi ${showPassword1 ? "pi-eye-slash" : "pi-eye"}`}></i>
                                                    </span>
                                                </button>
                                            </div>
                                            <div className="myPage_NewPass">
                                                <input
                                                    type={showPassword2 ? "text" : "password"}
                                                    placeholder="New password"
                                                    value={newPass}
                                                    onChange={(e) => setNewPass(e.target.value)}
                                                />
                                                <button className="myPage_password-toggle2" data-testid="myPage_password-toggle2" onClick={() => setShowPassword2(!showPassword2)}>
                                                    <span className="myPage_eye-symbol">
                                                        <i className={`pi ${showPassword2 ? "pi-eye-slash" : "pi-eye"}`}></i>
                                                    </span>
                                                </button>
                                                <p style={{ display: newPass ? 'block' : 'none' }} className="myPage_pass-error error">{passwordError}</p>
                                            </div>
                                            <div className="myPage_ConfPass">
                                                <input
                                                    type={showPassword3 ? "text" : "password"}
                                                    placeholder="Confirm password"
                                                    value={confirmPass}
                                                    onChange={(e) => setConfirmPass(e.target.value)}
                                                />
                                                <button className="myPage_password-toggle3" data-testid="myPage_password-toggle3" onClick={() => setShowPassword3(!showPassword3)}>
                                                    <span className="myPage_eye-symbol">
                                                        <i className={`pi ${showPassword3 ? "pi-eye-slash" : "pi-eye"}`}></i>
                                                    </span>
                                                </button>
                                                <p style={{ display: confirmPass ? 'block' : 'none' }} className="myPage_confirm-pass-error error">{confirmPasswordError}</p>
                                            </div>
                                        </div>
                                        <div className="myPage_SaveCancelBtns">
                                            <button className="myPage_SaveBtn" value="Save Changes" onClick={handleSavePass}> Save changes</button>
                                            <button className="myPage_CancelBtn" value="Cancel" onClick={handleCancelPass}> Cancel </button>
                                        </div>
                                    </div>
                                ) : (
                                    <span>**********</span>
                                )}
                            </div>
                        </div>
                        <hr />

                        {userDetails?.registrationMethod === "google" && (
                            <>
                                <div className="myPage_InfRow4">
                                    <label>Linked accounts</label>
                                    <div className="myPage_LinkedBox">
                                        <img src={GoogleLogo} alt="Google Logo" />
                                        <div className="myPage_InsideBox">
                                            <span className="myPage_ServiceName">Google</span>
                                            <span className="myPage_AccName">{userDetails?.name}</span>
                                        </div>
                                    </div>
                                </div>
                                <hr />
                            </>
                        )}


                    </div>
                </div>
            </div >
            {/* OTP Overlay*/}
            {showOtpModal && (
                <div className="myPage_OTPOverlay" data-testid="myPage_OTPOverlay">
                    <div className="myPage_OTPModel">
                        <h3>Verification required</h3>
                        <p className="myPage_OTPNote">We have sent the verification OTP to your registered mail ID.</p>
                        <input
                            className="myPage_OTPInput"
                            type="text"
                            placeholder="Enter OTP"
                            value={otp}
                            onChange={(e) => setOtp(e.target.value)}
                        />

                        <div className="myPage_OTPButtons">
                            <button className="myPage_OTPContinue" onClick={verifyOtpAndReset} disabled={isVerifyingOtp}>
                                {isVerifyingOtp ? "Verifying..." : "Continue"}
                            </button>
                            <button className="myPage_OTPResend" onClick={resendOtp} disabled={isSendingOtp || resendCountdown > 0}>
                                {checkCountdown()}

                            </button>
                            <button className="myPage_OTPCancel" onClick={() => { setShowOtpModal(false); setOtp("");}}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="footer-div">
                <Footer darkMode={darkMode}
                    navigationLinks={[
                        { text: "Portfolio", href: "/portfolio" },
                        { text: "AI Insigths", href: "/ai-insight" },
                        { text: "Watchlist", href: "/watchlist" }
                    ]}
                    legalLinks={[
                        { text: "Privacy Policy", href: "#privacy" },
                        { text: "Terms Of Service", href: "#terms" },
                        { text: "Contact Us", href: "#contact" },
                    ]} />
            </div>
        </div >
    );
};

