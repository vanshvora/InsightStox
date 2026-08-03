import {
    uploadOnCloudinary,
    deleteFromCloudinary,
} from "../../utils/cloudinary.js";
import { updateProfileImage } from "../../db/updateProfileImage.js";
import { defaultProfileImage } from "../../../constants.js";
import { removeOldProfileImagesFromCloudionary } from "../../utils/removeOldProfile.js";
import { addActivityHistory } from "../../mongoModels/user.model.js";
const updateProfileImageController = async (req, res) => {
    try {
        const oldProfileImage = req.user.profileimage;
        const profileImageLocalPath = req?.file?.path;

        if (!profileImageLocalPath)
            return res.status(400).json({
                success: false,
                message: "Please provide a valid image.",
            });

        const profileImage = await uploadOnCloudinary(profileImageLocalPath);

        if (!profileImage || !profileImage.secure_url)
            return res.status(503).json({
                success: false,
                message: "Failed to upload profile image.",
            });

        const email = req.user.email;

        const success = await updateProfileImage(email, profileImage.secure_url);

        if (!success || success.length === 0) {
            const deleteProfileImage = await deleteFromCloudinary(
                profileImage.public_id
            );
            if (!deleteProfileImage) {
                removeOldProfileImagesFromCloudionary.add(
                    profileImage.public_id
                );
            }

            return res.status(500).json({
                success: false,
                message: "Failed to update profile image.",
            });
        }
        
        if (oldProfileImage !== defaultProfileImage && oldProfileImage.startsWith("https://res.cloudinary.com")) {
            const parts = oldProfileImage.split("/");
            const filename = parts[parts.length - 1];
            const publicId = filename.split(".")[0];
            const deleteOldProfileImage = await deleteFromCloudinary(publicId);
            if (!deleteOldProfileImage) {
                removeOldProfileImagesFromCloudionary.add(publicId);
            }
        }

        req.user.profileimage = profileImage.secure_url;

        const newActivity = {
            os_type: req.activeSession.osType,
            browser_type: req.activeSession.browserType,
            type: "profileimage",
            message: "Updated profile image",
            token: req.cookies.token,
        };

        await addActivityHistory(email, newActivity);

        return res.status(200).json({
            success: true,
            message: "Profile image updated successfully.",
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            success: false,
            message: "Failed to update profile image. Please try again later.",
        });
    }
};

export { updateProfileImageController };
