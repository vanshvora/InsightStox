import axios from "axios";
import { validateNameStrength } from "./validation.js";
import { useAppContext } from "../context/AppContext.jsx";

export const MyProfileHandlers = ({ setChangeInProfile, setUserDetails, setIsEditingInfo, editedName, resendCountdown,
    currPass, newPass, confirmPass, setIsSendingOtp, setOtp, setResendCountdown,
    setIsVerifyingOtp, setConfirmPass, setCurrPass, setNewPass, setShowOtpModal, otp, setIsEditingPass
}) => {

    axios.defaults.withCredentials = true;

    const handlePicChange = async (event) => {
        const filePath = event.target.files[0];

        if (filePath && filePath.type.startsWith("image/")) {

            const profilePicURL = URL.createObjectURL(filePath);
            const picData = new FormData();
            picData.append("profileImage", filePath);

            try {
                await axios.patch(import.meta.env.VITE_BACKEND_LINK + "/users/profile/image/", picData,
                    { withCredentials: true, headers: { "Content-Type": "multipart/form-data" }, });
                setChangeInProfile(picData);
                setIsEditingInfo(false);

            } catch (err) {
                //1
                //console.error("Error updating profile image:", err.response?.data?.message || err.message);
                alert("Failed to update profile image. Try again later.");
                return;
            }
        }
        else {
            alert("Invalid file, Please select a valid file!")
        }
    };

    const handleSaveName = async () => {

        const testName = validateNameStrength(editedName);
        console.log("Valid Name", editedName);
        if (testName) {
            try {
                await axios.patch(import.meta.env.VITE_BACKEND_LINK + "/users/profile/name/", { name: editedName.trim() }, { withCredentials: true });
                setChangeInProfile(editedName);
                setIsEditingInfo(false);

            } catch (err) {
                //2
                //console.error("Error updating name:", err.response?.data?.message || err.message);
                alert("Failed to update name. Try again later.");
                return;
            }
        }
        else {
            alert("Invalid Name!");
        }

    };

    const handleSavePass = async () => {
        if (confirmPass === newPass) {
            try {
                setIsSendingOtp(true);
                await axios.patch(import.meta.env.VITE_BACKEND_LINK + "/users/password/reset/otp/", {}, { withCredentials: true });
                setShowOtpModal(true);
                setChangeInProfile(newPass);
                setOtp("");
                setResendCountdown(30);
            } catch (err) {
                //3
                //console.error("Error sending OTP:", err.response?.data?.message || err.message);
                alert("Failed to send OTP. Try again later.");
            } finally {
                setIsSendingOtp(false);
            }
        }
        else {
            alert("new password and confirm password does not match!");
        }
    };

    const resendOtp = async () => {
        if (resendCountdown > 0) return;
        try {
            setIsSendingOtp(true);
            await axios.patch(import.meta.env.VITE_BACKEND_LINK + "/users/password/reset/otp/", {}, { withCredentials: true });
            setResendCountdown(30);
        } catch (err) {
            //4
            //console.error("Error resending OTP:", err.response?.data?.message || err.message);
            alert("Failed to resend OTP. Try again.");
        } finally {
            setIsSendingOtp(false);
        }
    };

    const verifyOtpAndReset = async () => {
        if (!otp.trim()) {
            alert("Please enter the OTP");
            return;
        }

        try {
            setIsVerifyingOtp(true);
            await axios.post(import.meta.env.VITE_BACKEND_LINK + "/users/password/reset/verify/", { otp: otp }, { withCredentials: true });
            setShowOtpModal(false);
            setChangeInProfile(otp);
            await axios.patch(import.meta.env.VITE_BACKEND_LINK + "/users/password/reset/", { password: newPass }, { withCredentials: true });
            setIsEditingPass(false);
            setCurrPass("");
            setNewPass("");
            setConfirmPass("");
            setOtp("");
            
            alert("Password changed successfully after OTP verification.");
        } catch (err) {
            const msg = err.response?.data?.message || err.message;
            //5
            //console.error("OTP verify/reset error:", msg);
            alert("OTP verify/reset error:");
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleInvExp = async (event) => {

        if (event.target.value === "") {
            alert("Please select a valid option!");
        }
        else {

            try {
                await axios.patch(import.meta.env.VITE_BACKEND_LINK + "/users/profile/investment-experience/",
                    { investmentExperience: event.target.value },
                    { withCredentials: true });
                setChangeInProfile(event.target.value);
            }
            catch (err) {
                //6
                //console.error("Error updating investment experience:", err.response?.data?.message || err.message);
                alert("Failed to update investment experience. Try again later.");
                return;
            }
        }
    }

    const handleRiskProf = async (event) => {

        if (event.target.value === "") {
            alert("Please select a valid option!");
        }
        else {
            try {
                await axios.patch(import.meta.env.VITE_BACKEND_LINK + "/users/profile/risk-profile/",
                    { riskProfile: event.target.value },
                    { withCredentials: true })
                setChangeInProfile(event.target.value);
            }
            catch (err) {
                //7
                //console.error("Error updating risk profile:", err.response?.data?.message || err.message);
                alert("Failed to update risk profile. Try again later.");
                return;
            }
        }
    }

    const handleFinGoals = async (event) => {

        if (event.target.value === "") {
            alert("Please select a valid option!");
        }
        else {
            try {
                await axios.patch(import.meta.env.VITE_BACKEND_LINK + "/users/profile/financial-goals/",
                    { financialGoals: event.target.value },
                    { withCredentials: true })
                setChangeInProfile(event.target.value);
            }
            catch (err) {
                //8
                //console.error("Error updating financial goal:", err.response?.data?.message || err.message);
                alert("Failed to update financial goal. Try again later.");
                return;
            }
        }
    }

    const handleInvHorizon = async (event) => {

        if (event.target.value === "") {
            //alert("Please select a valid option!");
        }
        else {
            try {
                await axios.patch(import.meta.env.VITE_BACKEND_LINK + "/users/profile/investment-horizon/",
                    { investmentHorizon: event.target.value },
                    { withCredentials: true })
                setChangeInProfile(event.target.value);
            }
            catch (err) {
                //9    
                //console.error("Error updating investment horizon:", err.response?.data?.message || err.message);
                alert("Failed to update investment horizon. Try again later.");
                return;
            }
        }
    }

    return { handlePicChange, handleSaveName, handleSavePass, resendOtp, verifyOtpAndReset, handleInvExp, handleRiskProf, handleFinGoals, handleInvHorizon };
};
