const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../config/database');

// ============================================================
// POST - Login
// ============================================================
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password required'
            });
        }

        const [users] = await pool.query(
            'SELECT id, email, username, password_hash, role, status FROM users WHERE email = ?',
            [email]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        const user = users[0];
        
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid credentials' });
        }
        
        if (user.status !== 'active') {
            return res.status(403).json({ success: false, error: 'Account is not active' });
        }
        
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                username: user.username,
                role: user.role 
            },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
        
    } catch (error) {
        console.error('❌ Login Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================================
// POST - Register (New User)
// ============================================================
router.post('/register', async (req, res) => {
    try {
        const { email, username, password } = req.body;
        
        if (!email || !username || !password) {
            return res.status(400).json({
                success: false,
                error: 'All fields required'
            });
        }

        const [existing] = await pool.query(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );
        
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                error: 'User already exists'
            });
        }
        
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);
        
        const [result] = await pool.query(
            `INSERT INTO users (email, username, password_hash, role, status, permissions)
             VALUES (?, ?, ?, 'user', 'pending', ?)`,
            [email, username, passwordHash, JSON.stringify({})]
        );
        
        res.json({
            success: true,
            message: 'User registered successfully. Waiting for admin approval.',
            userId: result.insertId
        });
        
    } catch (error) {
        console.error('❌ Register Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;
