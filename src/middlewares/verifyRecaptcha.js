// middleware/verifyRecaptcha.js
import axios from 'axios';

export const verifyRecaptcha = async (req, res, next) => {
  const { recaptchaToken } = req.body;
  if (!recaptchaToken) {
    return res.status(400).json({ success: false, message: 'Missing reCAPTCHA token' });
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${process.env.RECAPTCHA_SECRET_KEY}&response=${recaptchaToken}`
    );

    if (!response.data.success) {
      return res.status(400).json({
        success: false,
        message: 'reCAPTCHA verification failed',
        errors: response.data['error-codes']
      });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ success: false, message: 'reCAPTCHA verification error' });
  }
};
