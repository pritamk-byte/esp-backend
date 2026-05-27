const express = require('express');
const cors = require('cors');
require('dotenv').config();

// ==========================================
// 1. IMPORTS
// ==========================================
const { requestOtp, verifyOtp } = require('./controllers/authController');
const { getMyProfile, completeOnboarding } = require('./controllers/userController'); 
const { createRequest, getMyRequests, acceptQuote } = require('./controllers/clientController');
const { getAllRequests, updateRequestStatus, assignWorker, getAllWorkers, updateWorkerKYC, addQuote, getAllInspectors, assignInspector, updateUserRole } = require('./controllers/adminController');
const { getAvailableJobs, expressInterest, getMyAssignedJobs, completeJob, getWorkerProfile, submitKYC } = require('./controllers/workerController');
const { getAssignedInspections, submitInspectionReport } = require('./controllers/inspectorController');
const { getCallList, addCallNote } = require('./controllers/telecallerController');

const authenticateToken = require('./middleware/authMiddleware');
const authorizeRoles = require('./middleware/roleMiddleware');

const app = express();

// ==========================================
// 🚀 2. TEMPORARY "ALLOW ALL" CORS 
// ==========================================
app.use(cors({
  origin: true, // This automatically accepts the exact URL Vercel asks with!
  credentials: true
}));


app.use(express.json());

// ==========================================
// 3. ROUTES
// ==========================================

// Public Auth Routes
app.post('/api/auth/send-otp', requestOtp);
app.post('/api/auth/verify-otp', verifyOtp);

// Universal User Routes (For Onboarding & Profile)
app.get('/api/user/me', authenticateToken, getMyProfile);
app.put('/api/user/onboard', authenticateToken, completeOnboarding);

// Client Routes
app.post('/api/client/requests', authenticateToken, authorizeRoles('CLIENT'), createRequest);
app.get('/api/client/requests', authenticateToken, authorizeRoles('CLIENT'), getMyRequests);
app.put('/api/client/requests/:id/accept-quote', authenticateToken, authorizeRoles('CLIENT'), acceptQuote);

// Worker Routes
app.get('/api/worker/profile', authenticateToken, authorizeRoles('WORKER'), getWorkerProfile);
app.post('/api/worker/kyc', authenticateToken, authorizeRoles('WORKER'), submitKYC);
app.get('/api/worker/jobs', authenticateToken, authorizeRoles('WORKER'), getAvailableJobs);
app.post('/api/worker/interest', authenticateToken, authorizeRoles('WORKER'), expressInterest);
app.put('/api/worker/my-jobs/:id/complete', authenticateToken, authorizeRoles('WORKER'), completeJob);
app.get('/api/worker/my-jobs', authenticateToken, authorizeRoles('WORKER'), getMyAssignedJobs);

// Inspector Routes
app.get('/api/inspector/inspections', authenticateToken, authorizeRoles('INSPECTOR'), getAssignedInspections);
app.put('/api/inspector/inspections/:id/report', authenticateToken, authorizeRoles('INSPECTOR'), submitInspectionReport);

// Admin Routes (SUPER_ADMIN, ADMIN_MANAGER, TELECALLER)
app.put('/api/admin/users/role', authenticateToken, authorizeRoles('SUPER_ADMIN'), updateUserRole); 
app.get('/api/admin/requests', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN_MANAGER', 'TELECALLER'), getAllRequests);
app.put('/api/admin/requests/:id/status', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN_MANAGER', 'TELECALLER'), updateRequestStatus);
app.post('/api/admin/requests/:id/assign', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN_MANAGER', 'TELECALLER'), assignWorker);
app.put('/api/admin/requests/:id/quote', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN_MANAGER', 'TELECALLER'), addQuote);
app.get('/api/admin/inspectors', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN_MANAGER', 'TELECALLER'), getAllInspectors);
app.post('/api/admin/requests/:id/assign-inspector', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN_MANAGER', 'TELECALLER'), assignInspector);
app.get('/api/admin/workers', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN_MANAGER', 'TELECALLER'), getAllWorkers);
app.put('/api/admin/workers/:workerId/kyc', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN_MANAGER', 'TELECALLER'), updateWorkerKYC);

// Telecaller Routes (Fixed array syntax)
app.get('/api/telecaller/jobs', authenticateToken, authorizeRoles('TELECALLER', 'SUPER_ADMIN'), getCallList);
app.put('/api/telecaller/jobs/:id/note', authenticateToken, authorizeRoles('TELECALLER', 'SUPER_ADMIN'), addCallNote);

// ==========================================
// 4. SERVER START
// ==========================================
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});