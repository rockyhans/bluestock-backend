import mongoose from "mongoose";

const ipoSchema = new mongoose.Schema({
    companyLogo: { data: Buffer, contentType: String },
    companyName: { type: String, required: [true, "Company name is required!"] },
    prizeBand: { type: Number, required: [true, "Prize band is required!"] },
    open: { type: Date, required: [true, "Opening date is required!"] },
    close: { type: Date, required: [true, "Closing date is required!"] },
    issueSize: { type: Number, required: [true, "Issue size is required!"] },
    issueType: { type: String, required: [true, "Issue type is required!"] },
    listingDate: { type: Date, required: [true, "Listing date is required!"] },
    status: {
        type: String,
        enum: {
            values: ["Ongoing", "Coming", "New Listed"],
            message: "Status must be one of: Ongoing, Coming, New Listed"
        },
        required: [true, "Status is required!"]
    },
    ipoPrice: { type: String, required: [true, "IPO price is required!"] },
    listingPrice: { type: String, required: [true, "Listing price is required!"] },
    listingGain: { type: Number, required: [true, "Listing gain is required!"] },
    cmp: { type: Number, required: [true, "Current market price is required!"] },
    currentReturn: { type: String, required: [true, "Current return is required!"] },
    rhp: { type: String, required: [true, "RHP URL is required!"] },
    drhp: { type: String, required: [true, "DRHP URL is required!"] }
}, {
    timestamps: true
});

const IpoModel = mongoose.model("Ipo", ipoSchema);
export default IpoModel;
