class CustomError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.statusCode = statusCode;

        // Maintains proper stack trace (only available in V8)
        Error.captureStackTrace(this, this.constructor);
    }
}

export default CustomError;
