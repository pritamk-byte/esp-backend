const prisma = require('../utils/db');

const getAllRequests = async (req, res) => {
    try {
        const { status, limit = 50, offset = 0 } = req.query;

        const queryOptions = {
            include: {
                client: { select: { email: true, phone: true } },
                interests: {
                    include: {
                        worker: { select: { id: true, email: true, phone: true } }
                    }
                }
            },
            orderBy: { createdAt: 'desc' },
            take: Number(limit),
            skip: Number(offset)
        };

        if (status && status !== 'ALL') queryOptions.where = { status };

        const requests = await prisma.serviceRequest.findMany(queryOptions);
        const totalCount = await prisma.serviceRequest.count({ where: queryOptions.where });

        res.status(200).json({ data: requests, meta: { total: totalCount, limit, offset } });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch administrative requests." });
    }
};

const updateRequestStatus = async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = [
        'PENDING', 'UNDER_REVIEW', 'NEEDS_INSPECTION', 'INSPECTION_DONE', 
        'WAITING_WORKER', 'WORKER_ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'
    ];

    if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status." });

    try {
        const updatedRequest = await prisma.serviceRequest.update({
            where: { id },
            data: { status }
        });
        res.status(200).json({ message: "Status updated successfully", data: updatedRequest });
    } catch (error) {
        res.status(500).json({ error: "Failed to transition state." });
    }
};

const assignWorker = async (req, res) => {
    const { id } = req.params; 
    const { workerId } = req.body;

    try {
        await prisma.$transaction([
            prisma.serviceRequest.update({
                where: { id },
                data: { status: 'WORKER_ASSIGNED' }
            }),
            prisma.jobInterest.update({
                where: { workerId_serviceRequestId: { workerId, serviceRequestId: id } },
                data: { status: 'ACCEPTED' }
            }),
            prisma.jobInterest.updateMany({
                where: { serviceRequestId: id, workerId: { not: workerId } },
                data: { status: 'REJECTED' }
            })
        ]);

        res.status(200).json({ message: "Worker successfully assigned!" });
    } catch (error) {
        res.status(500).json({ error: "Failed to assign worker." });
    }
};

// Fetch all workers for KYC review
const getAllWorkers = async (req, res) => {
    try {
        const workers = await prisma.user.findMany({
            where: { role: 'WORKER' },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(workers);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch workers." });
    }
};

// Approve or Reject a Worker's KYC
const updateWorkerKYC = async (req, res) => {
    const { workerId } = req.params;
    const { status, isVerified } = req.body; 

    try {
        const user = await prisma.user.update({
            where: { id: workerId },
            data: { 
                verificationStatus: status, 
                isVerified: isVerified 
            }
        });
        res.status(200).json({ message: `Worker successfully marked as ${status}.`, user });
    } catch (error) {
        res.status(500).json({ error: "Failed to update KYC status." });
    }
};

// Admin adds a quoted price to a service request
const addQuote = async (req, res) => {
    const { id } = req.params;
    const { quotedPrice } = req.body;

    try {
        const request = await prisma.serviceRequest.update({
            where: { id },
            data: { 
                quotedPrice: parseFloat(quotedPrice),
                status: 'UNDER_REVIEW' 
            }
        });
        res.status(200).json({ message: "Quote added successfully!", request });
    } catch (error) {
        res.status(500).json({ error: "Failed to add quote." });
    }
};

// Fetch all users with the INSPECTOR role
const getAllInspectors = async (req, res) => {
    try {
        const inspectors = await prisma.user.findMany({
            where: { role: 'INSPECTOR' },
            select: { id: true, email: true, phone: true }
        });
        res.status(200).json(inspectors);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch inspectors." });
    }
};

// Assign an inspector to a specific service request
const assignInspector = async (req, res) => {
    const { id } = req.params;
    const { inspectorId, adminNote } = req.body; 

    try {
        const request = await prisma.serviceRequest.update({
            where: { id },
            data: { 
                inspectorId,
                adminNote,
                status: 'NEEDS_INSPECTION'
            }
        });
        res.status(200).json({ message: "Inspector dispatched with instructions!", request });
    } catch (error) {
        res.status(500).json({ error: "Failed to assign inspector." });
    }
};

// Super Admin changes a user's role
const updateUserRole = async (req, res) => {
    const { email, newRole } = req.body;

    const validRoles = ['CLIENT', 'WORKER', 'TELECALLER', 'INSPECTOR', 'ADMIN_MANAGER', 'SUPER_ADMIN'];
    if (!validRoles.includes(newRole)) {
        return res.status(400).json({ error: "Invalid role selected." });
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { email: email.trim().toLowerCase() },
            data: { role: newRole }
        });
        res.status(200).json({ message: `Success! ${email} is now a ${newRole}.`, user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: "Failed to update user role. Make sure the email exists." });
    }
};

// ==========================================
// 🚀 NEW: DASHBOARD ANALYTICS & CLIENTS
// ==========================================

// GET /api/admin/stats
const getDashboardStats = async (req, res) => {
    try {
        const totalTasks = await prisma.serviceRequest.count();

        const activeWorkers = await prisma.user.count({
            where: { role: 'WORKER', verificationStatus: 'APPROVED' }
        });

        const pendingKYC = await prisma.user.count({
            where: { role: 'WORKER', verificationStatus: 'PENDING' }
        });

        const revenue = await prisma.serviceRequest.aggregate({
            _sum: { finalPrice: true },
            where: { paymentStatus: 'FULLY_PAID' }
        });

        res.status(200).json({
            totalTasks,
            activeWorkers,
            pendingKYC,
            totalEarned: revenue._sum.finalPrice || 0
        });
    } catch (error) {
        console.error("Stats API Error:", error);
        res.status(500).json({ error: "Failed to fetch dashboard statistics." });
    }
};

// GET /api/admin/clients
const getAllClients = async (req, res) => {
    try {
        const clients = await prisma.user.findMany({
            where: { role: 'CLIENT' },
            select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                createdAt: true
            },
            orderBy: { createdAt: 'desc' }
        });

        res.status(200).json(clients);
    } catch (error) {
        console.error("Clients API Error:", error);
        res.status(500).json({ error: "Failed to fetch clients." });
    }
};

// Export ALL functions, including the two new ones!
module.exports = { 
    getAllRequests, 
    updateRequestStatus, 
    assignWorker, 
    getAllWorkers, 
    updateWorkerKYC, 
    addQuote, 
    getAllInspectors, 
    assignInspector, 
    updateUserRole,
    getDashboardStats,  // <-- Added
    getAllClients       // <-- Added
};