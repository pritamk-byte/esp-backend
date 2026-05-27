const prisma = require('../utils/db');

// 1. Client creates a new service request
const createRequest = async (req, res) => {
    const { title, serviceType, description, location } = req.body;

    if (!title || !serviceType || !description || !location) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const newRequest = await prisma.serviceRequest.create({
            data: {
                title,
                serviceType,
                description,
                location,
                clientId: req.user.id // Pulled safely from the JWT token!
            }
        });
        res.status(201).json({ message: "Request submitted successfully!", request: newRequest });
    } catch (error) {
        res.status(500).json({ error: "Failed to create service request." });
    }
};

// 2. Client fetches only THEIR requests
const getMyRequests = async (req, res) => {
    try {
        const requests = await prisma.serviceRequest.findMany({
            where: { clientId: req.user.id },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(requests);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch requests." });
    }
};

// 3. Client accepts the Admin's quote
const acceptQuote = async (req, res) => {
    const { id } = req.params;

    try {
        const request = await prisma.serviceRequest.update({
            where: { id, clientId: req.user.id }, // Ensure it belongs to them
            data: { status: 'WAITING_WORKER' }    // Push it to the worker marketplace!
        });
        res.status(200).json({ message: "Quote accepted! Searching for workers.", request });
    } catch (error) {
        res.status(500).json({ error: "Failed to accept quote." });
    }
};

module.exports = { createRequest, getMyRequests, acceptQuote };