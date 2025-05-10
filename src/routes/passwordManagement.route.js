import express from 'express'
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import CustomError from '../util/customError.util.js';
import userModel from '../models/user.model.js';
import { resetPasswordEmail } from '../config/mailer.config.js';

const route = express.Router();

export const forgotPassword = async (req, res, next) => {
    const { email } = req.body;

    try {
        if(!email) throw new CustomError("Email is required!", 400);
        
        const user = await userModel.findOne({ email });
        if (!user) throw new CustomError("No user found with that email!", 404);

        // Generate reset token
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Set token & expiration on user (save hashed token)
        user.resetPasswordToken = tokenHash;
        user.resetPasswordExpires = Date.now() + 15 * 60 * 1000; // 15 minutes
        // user.resetPasswordExpires = Date.now() + 1 * 60 * 1000; // 1 minute for testing
        await user.save();

        // Send reset password email
        const resetPassword = await resetPasswordEmail(email, token, '15 minutes');
        if (!resetPassword) throw new CustomError("Mail cannot be sent at the moment! Please try again later!", 500);

        res.status(200).json({ success: true, message: 'Password reset link sent successfully.', token });
    } catch (err) {
        next(err);
    }
};

export const resetPassword = async (req, res, next) => {
    const { email, token, newPassword } = req.body;
    if (!email || !token || !newPassword) throw new CustomError("Invalid credentials!", 400);

    try {
        // Hash the incoming token to compare with the stored hashed token
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Find the user by email only first (to check if the email exists)
        const user = await userModel.findOne({ email }).select("+password");
        if (!user) throw new CustomError("No user found with this email!", 404);

        if (!user.resetPasswordToken || !user.resetPasswordExpires) {
            throw new CustomError("No password reset request was made for this account!", 400);
        }

        if (user.resetPasswordToken !== tokenHash) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            throw new CustomError("Invalid reset link!", 400);
        }

        // Check if the link has expired
        if (user.resetPasswordExpires < Date.now()) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;
            await user.save();

            throw new CustomError("Reset link has expired! Please request a new one.", 400);
        }

        // Check if the new password is the same as the old password
        const isOldPassword = await bcrypt.compare(newPassword, user.password);
        if(isOldPassword) throw new CustomError("New password cannot be same as the old password!", 409);

        // If all checks pass, update the password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        return res.status(200).json({ success: true, message: "Password has been reset successfully." });
    } catch (err) {
        next(err);
    }
};

// full endpoint ('/password/forgot-password')
route.post('/forgot-password', forgotPassword);
route.patch('/reset-password', resetPassword);
export default route;