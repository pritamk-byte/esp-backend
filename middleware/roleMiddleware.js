const authorizeRoles = (...allowedRoles) => {
    // 🚀 NEW: .flat() unpacks the double-array so it works flawlessly
    // whether you pass ['ROLE'] or ('ROLE') in your routes!
    const validRoles = allowedRoles.flat();

    return (req, res, next) => {
        if (!req.user || !req.user.role) {
            return res.status(401).json({ error: "Unauthorized. Missing user role context." });
        }

        // Check if the user's role matches the valid roles
        const hasRole = validRoles.includes(req.user.role);
        
        if (!hasRole) {
            return res.status(403).json({ error: "Access denied. Insufficient permissions." });
        }

        next();
    };
};

module.exports = authorizeRoles;