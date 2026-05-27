const prisma = require('../utils/db');

// Create a new service request
const createRequest = async (req, res) => {
    const { title, serviceType, description, location } = req.body;
    const clientId = req.user.id;

    try {
        const newRequest = await prisma.serviceRequest.create({
            data: { title, serviceType, description, location, clientId }
        });
        res.status(201).json({ message: "Request submitted successfully!", data: newRequest });
    } catch (error) {
        console.error("[Client API Error - createRequest]:", error);
        res.status(500).json({ error: "Failed to create request." });
    }
};

// Fetch client's requests WITH assigned worker details
const getClientRequests = async (req, res) => {
    try {
        const clientId = req.user.id;
        const requests = await prisma.serviceRequest.findMany({
            where: { clientId },
            include: {
                // Fetch the hired worker's details if the admin assigned one
                interests: {
                    where: { status: 'ACCEPTED' },
                    include: {
                        worker: { select: { email: true, phone: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(requests);
    } catch (error) {
        console.error("[Client API Error - getClientRequests]:", error);
        res.status(500).json({ error: "Failed to fetch your requests." });
    }
};
// NEW: Client accepts the quote and sends it to the marketplace
const acceptQuote = async (req, res) => {
    const { id } = req.params;

    try {
        // We verify clientId so a client can only accept their OWN quotes
        const request = await prisma.serviceRequest.update({
            where: { 
                id: id,
                clientId: req.user.id 
            },
            data: { status: 'WAITING_WORKER' }
        });
        res.status(200).json({ message: "Quote accepted! Searching for professionals.", request });
    } catch (error) {
        res.status(500).json({ error: "Failed to accept quote." });
    }
};

// Update your export to include acceptQuote:
module.exports = { createRequest, getClientRequests, acceptQuote };