import userModel from "../models/user.model.js";

export const sharedLogout = async (req, res) => {
    console.log(`[${new Date().toISOString()}] [LOGOUT] Started for session ${req.sessionID}`);
    
    try {
        // Check for active session
        if (!req.session) {
            console.log('[LOGOUT] No active session found');
            return res.status(400).json({
                success: false,
                message: "No active session"
            });
        }

        // Enhanced user logging
        let user = null;
        if (req.user) {
            user = req.user;
        } else if (req.session.passport?.user) {
            user = await userModel.findById(req.session.passport.user).select('-password');
        } else if (req.session.user) {
            user = req.session.user;
        }

        // if (user) {
        //     console.log(`[LOGOUT] Attempting logout for user: ${user.email || user._id}`);
        // }

        // Handle all session types
        req.session.destroy((err) => {
            if (err) {
                // console.error('[LOGOUT ERROR] Session destruction failed:', err);
                return res.status(500).json({
                    success: false,
                    message: "Failed to destroy session"
                });
            }

            // Clear the session cookie
            res.clearCookie('connect.sid', {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
            });

            // Additional cookie clearing for passport if needed
            res.clearCookie('connect.sid', {
                path: '/',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
            });

            // console.log(`[LOGOUT SUCCESS] User ${user?.email || 'unknown'} logged out`);
            return res.status(200).json({
                success: true,
                message: "Logged out successfully"
            });
        });

    } catch (error) {
        console.error(`[LOGOUT ERROR] ${error.message}`, {
            stack: error.stack,
            sessionId: req.sessionID
        });
        return res.status(500).json({
            success: false,
            message: "An error occurred during logout"
        });
    }
};