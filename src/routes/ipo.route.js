import express from 'express';
import multer from 'multer';
import CustomError from '../util/customError.util.js';
import IpoModel from '../models/IPO.model.js';
// check first if the request user is valid or with session except for fetchall route
import { isAuthenticated } from '../middlewares/auth.middleware.js';
import mongoose from 'mongoose';

const route = express.Router();

// Configure multer for file upload
const storage = multer.memoryStorage(); // Store files in memory as Buffer
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new CustomError('Only image files are allowed!', 400), false);
        }
    }
});

// route to fetch all the ipo ('/ipo/fetchall')
route.get('/fetchall', async (req, res, next) => {
    try {
        const ipo = await IpoModel.find();
        if (!ipo) throw new CustomError("An unexpected error occured while trying to fetch the IPOs!", 500);

        if (ipo.length <= 0) throw new CustomError("There are no IPOs!", 404);

        return res.status(200).json({ success: true, data: ipo });
    } catch (error) {
        next(error);
    }
});

// route to register IPO ('/ipo/register')
route.post('/register',
    isAuthenticated,
    upload.single('companyLogo'), // Handle single file upload
    async (req, res, next) => {
        try {
            const credentials = req.body;
            const logoFile = req.file; // Access the uploaded file

            if (!credentials) throw new CustomError("Invalid credentials!", 400);

            const ipoData = {
                ...credentials,
                // Store the logo as Buffer if provided
                companyLogo: logoFile ? {
                    data: logoFile.buffer,
                    contentType: logoFile.mimetype
                } : undefined
            };

            const ipo = await IpoModel.create(ipoData);
            if (!ipo) throw new CustomError("Error creating IPO!", 500);

            return res.status(201).json({
                success: true,
                message: "IPO created successfully!",
                data: ipo
            });
        } catch (error) {
            next(error);
        }
    }
);

// route to delete the specific ipo using the ipoId ('/ipo/delete/:ipoId')
route.delete('/delete/:ipoId', isAuthenticated, async (req, res, next) => {
    const { ipoId } = req.params;
    try {
        // 1. Validate IPO ID format
        if (!ipoId || !mongoose.Types.ObjectId.isValid(ipoId)) throw new CustomError("Invalid ipoId!", 400);

        // Check if IPO exists and delete
        const deletedIPO = await IpoModel.findOneAndDelete({ _id: ipoId });
        if (!deletedIPO) throw new CustomError("IPO not found!", 404);

        res.status(200).json({
            success: true,
            message: "IPO deleted successfully",
            data: {
                id: deletedIPO._id,
                companyName: deletedIPO.companyName
            }
        });
    } catch (error) {
        next(error);
    }
});

// route to delete the company logo ('ipo/remove-companylogo/:ipoId')
route.patch('/remove-companylogo/:ipoId', isAuthenticated, async (req, res, next) => {
    const { ipoId } = req.params;
    try {
        if (!ipoId || !mongoose.Types.ObjectId.isValid(ipoId)) throw new CustomError("Invalid ipoId!", 400);

        const updatedIPO = await IpoModel.findByIdAndUpdate(
            ipoId,
            { $set: { companyLogo: "" } }, // this can be 'null' or an empty string.. just like this
            { new: true }
        );
        if (!updatedIPO) throw new CustomError("IPO not found!", 404);

        res.status(200).json({
            success: true,
            data: updatedIPO
        });
    } catch (error) {
        next(error);
    }
});

// route to update the specific ipo using the ipoId ('/ipo/update/:ipoId')
route.patch('/update/:ipoId', isAuthenticated, async (req, res, next) => {
    const { ipoId } = req.params;
    const updateData = req.body;

    try {
        if (!ipoId || !mongoose.Types.ObjectId.isValid(ipoId)) throw new CustomError("Invalid IPO ID format", 400);
        if (!updateData || Object.keys(updateData).length === 0) throw new CustomError("No update data provided", 400);

        // List of allowed fields that can be updated
        const allowedFields = [
            'companyName',
            'prizeBand',
            'open',
            'close',
            'issueSize',
            'listingDate'
        ];

        // Filtering out disallowed fields
        const filteredUpdate = {};
        for (const field in updateData) {
            if (allowedFields.includes(field)) {
                filteredUpdate[field] = updateData[field];
            }
        }

        // Validate at least one valid field remains
        if (Object.keys(filteredUpdate).length === 0) throw new CustomError("No valid fields provided for update", 400);

        const updatedIPO = await IpoModel.findByIdAndUpdate(
            ipoId,
            { $set: filteredUpdate },
            { new: true, runValidators: true }
        );
        if (!updatedIPO) throw new CustomError("IPO not found", 404);

        res.status(200).json({
            success: true,
            message: "IPO updated successfully",
            data: updatedIPO
        });
    } catch (error) {
        next(error);
    }
});

export default route;