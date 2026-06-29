const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

// ============================================================
// ALLOWED TABLES (Security - prevent SQL injection)
// ============================================================
const allowedTables = [
    'vendors', 'contracts', 'general', 'receivables', 'payables',
    'provisions', 'payroll', 'employees', 'gstDetails', 'leaveBalances',
    'deleted_records', 'contractHistory', 'master', 'advances', 'ledger',
    'assets', 'imprests', 'inventory'
];

// ============================================================
// GET ALL RECORDS FROM A TABLE
// ============================================================
router.get('/:table', authenticate, async (req, res) => {
    const { table } = req.params;

    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    try {
        const [rows] = await pool.query(`SELECT * FROM ${table}`);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// INSERT OR UPDATE RECORD
// ============================================================
router.put('/:table', authenticate, async (req, res) => {
    const { table } = req.params;
    const data = req.body;

    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    try {
        if (data.id) {
            // UPDATE - existing record
            const keys = Object.keys(data).filter(k => k !== 'id');
            if (keys.length === 0) {
                return res.status(400).json({ error: 'No fields to update' });
            }

            const setClause = keys.map(k => `${k} = ?`).join(', ');
            const values = keys.map(k => data[k]);
            values.push(data.id);

            await pool.query(`UPDATE ${table} SET ${setClause} WHERE id = ?`, values);
        } else {
            // INSERT - new record
            const keys = Object.keys(data);
            if (keys.length === 0) {
                return res.status(400).json({ error: 'No fields to insert' });
            }

            const placeholders = keys.map(() => '?').join(', ');
            const values = keys.map(k => data[k]);

            const [result] = await pool.query(
                `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`,
                values
            );

            // Return the new ID
            data.id = result.insertId;
        }

        res.json({ success: true, data });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// DELETE RECORD
// ============================================================
router.delete('/:table/:id', authenticate, async (req, res) => {
    const { table, id } = req.params;

    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    try {
        await pool.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
        res.json({ success: true, message: 'Record deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ============================================================
// CLEAR TABLE (Admin only)
// ============================================================
router.delete('/:table/clear', authenticate, async (req, res) => {
    const { table } = req.params;

    if (!allowedTables.includes(table)) {
        return res.status(400).json({ error: 'Invalid table name' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }

    try {
        await pool.query(`DELETE FROM ${table}`);
        res.json({ success: true, message: `All records deleted from ${table}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
