const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
    // 1. Get the token from the headers
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Splits "Bearer <token>"

    // 2. If no token, kick them out
    if (!token) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    try {
        // 3. Verify the token using the EXACT same secret as the authController
        const verified = jwt.verify(
            token, 
            process.env.JWT_SECRET || 'fallback_secret'
        );
        
        // 4. Attach the user ID to the request so userController can find them
        req.user = verified;
        next();
    } catch (error) {
        console.error("Token Verification Failed:", error.message);
        res.status(403).json({ error: 'Invalid or expired token.' });
    }
};

module.exports = authenticateToken;