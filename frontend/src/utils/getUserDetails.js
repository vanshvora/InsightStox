import axios from "axios";

// ✅ Fixed: Accept setUserDetails as a parameter instead of using hook inside function
export async function GetUserDetails(setUserDetails) {
    try {
        const res = await axios.get(import.meta.env.VITE_BACKEND_LINK + "/users/profile/", {
            withCredentials: true,
        });
        //console.log("User details fetched:", res.data);
        
        if (res.data.success) {
            console.log("Setting user details:", res.data.data);
            //console.log("Setting user details:", res.data.data.profileImage);
            setUserDetails(res.data.data);

        } else {
            console.error("Failed to fetch user details: success = false");
        }
    } catch (err) {
        console.error("Error fetching user details:", err);
        console.error("Error message:", err.message);
        console.error("Error response:", err.response?.data);
    }
}
