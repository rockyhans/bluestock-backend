import mongoose from "mongoose";

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Database connected succesfully!');
    } catch (err) {
        console.error('Database connection Error:', err);
        process.exit(1); 
    }
};

export default connectDB;