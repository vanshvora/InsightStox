import axios from "axios";

// ✅ Fixed: Accept setUserDetails as a parameter instead of using hook inside function
export async function GetUserDetails(setUserDetails) {
    try {
        const res = await axios.get(import.meta.env.VITE_BACKEND_LINK + "/users/profile/", {
            withCredentials: true,
        });
        //console.log("User details fetched:", res.data);
        
        if (res.data.success) {
            const d = res.data.data;
            const mappedUser = {
                id: d.id,
                name: d.name,
                email: d.email,
                registrationMethod: d.registration_method,
                investmentExp: d.investment_experience,
                riskProfile: d.risk_profile,
                FinGoal: d.financial_goals,
                InvHorizon: d.investment_horizon,
                profileImage: d.profile_image,
                theme: d.theme,
                dashboardLayout: d.dashboard_layout,
                isAiSuggestionOn: d.is_ai_suggestion_on
            };
            console.log("Setting user details:", mappedUser);
            setUserDetails(mappedUser);

        } else {
            console.error("Failed to fetch user details: success = false");
        }
    } catch (err) {
        console.error("Error fetching user details:", err);
        console.error("Error message:", err.message);
        console.error("Error response:", err.response?.data);
    }
}
