const express = require('express');
const { verifyToken } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', userController.register);

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', userController.login);

/**
 * GET /api/auth/profile
 * Get user profile (require auth)
 */
router.get('/profile', verifyToken, userController.getProfile);

/**
 * PUT /api/auth/profile
 * Update user profile (require auth)
 */
router.put('/profile', verifyToken, userController.updateProfile);

/**
 * DELETE /api/auth/account
 * Delete user account (require auth)
 */
router.delete('/account', verifyToken, userController.deleteAccount);

module.exports = router;
