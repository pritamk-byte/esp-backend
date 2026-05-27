const prisma = require('../utils/db');

const getAvailableJobs = async (req, res) => {
    try {
        const workerId = req.user.id;
        const availableJobs = await prisma.serviceRequest.findMany({
            where: { status: 'WAITING_WORKER' },
            include: { interests: { where: { workerId } } },
            orderBy: { createdAt: 'desc' }
        });
        res.status(200).json(availableJobs);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch available jobs." });
    }
};

const expressInterest = async (req, res) => {
    const { requestId } = req.body;
    const workerId = req.user.id;

    try {
        const interest = await prisma.jobInterest.create({
            data: { workerId, serviceRequestId: requestId }
        });
        res.status(201).json({ message: "Successfully applied for this job!", interest });
    } catch (error) {
        if (error.code === 'P2002') return res.status(400).json({ error: "You already applied for this job." });
        res.status(500).json({ error: "Failed to submit application." });
    }
};

// NEW: Fetch jobs that have been officially assigned to this worker
const getMyAssignedJobs = async (req, res) => {
    try {
        const workerId = req.user.id;
        const myJobs = await prisma.serviceRequest.findMany({
            where: {
                status: { in: ['WORKER_ASSIGNED', 'IN_PROGRESS', 'COMPLETED'] },
                interests: {
                    some: {
                        workerId: workerId,
                        status: 'ACCEPTED' // Only show jobs where their specific application was approved
                    }
                }
            },
            include: {
                client: { select: { email: true, phone: true } } // They need the client's info to do the work!
            },
            orderBy: { updatedAt: 'desc' }
        });
        res.status(200).json(myJobs);
    } catch (error) {
        console.error("[Worker API Error - getMyAssignedJobs]:", error);
        res.status(500).json({ error: "Failed to fetch your assigned jobs." });
    }
};

// NEW: Allow a worker to mark an assigned job as completed
const completeJob = async (req, res) => {
    const { id } = req.params; // The Service Request ID
    const workerId = req.user.id;

    try {
        // 1. Verify this worker is actually the hired person for this job
        const interest = await prisma.jobInterest.findUnique({
            where: {
                workerId_serviceRequestId: { workerId, serviceRequestId: id }
            }
        });

        if (!interest || interest.status !== 'ACCEPTED') {
            return res.status(403).json({ error: "You are not authorized to complete this job." });
        }

        // 2. Update the job status to COMPLETED
        const updatedRequest = await prisma.serviceRequest.update({
            where: { id },
            data: { status: 'COMPLETED' }
        });

        res.status(200).json({ message: "Job successfully marked as completed!", data: updatedRequest });
    } catch (error) {
        console.error("[Worker API Error - completeJob]:", error);
        res.status(500).json({ error: "Failed to complete the job." });
    }
};

// NEW: Fetch the worker's own profile to check KYC status
const getWorkerProfile = async (req, res) => {
    try {
        const user = await prisma.user.findUnique({ where: { id: req.user.id } });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch profile." });
    }
};

// NEW: Submit KYC Document
const submitKYC = async (req, res) => {
    const { idDocumentUrl } = req.body;
    try {
        const user = await prisma.user.update({
            where: { id: req.user.id },
            data: { idDocumentUrl, verificationStatus: 'PENDING' }
        });
        res.status(200).json({ message: "Identity document submitted for review!", user });
    } catch (error) {
        res.status(500).json({ error: "Failed to submit KYC." });
    }
};

// Make sure your export looks like this now:
module.exports = { getAvailableJobs, expressInterest, getMyAssignedJobs, completeJob, getWorkerProfile, submitKYC };