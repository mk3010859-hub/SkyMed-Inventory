const mysql = require('mysql2/promise');
require('dotenv').config();

// ============================================================
// TiDB CONNECTION - DIRECT CREDENTIALS
// ============================================================
const pool = mysql.createPool({
    host: 'gateway01.ap-southeast-1.prod.aws.tidbcloud.com',
    port: 4000,
    user: '2YhNuY9x9YR1dry.root',
    password: '1dUtzHOX5FrbzmKe',
    database: 'sys',
    ssl: {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: true
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// ============================================================
// TEST CONNECTION
// ============================================================
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ TiDB Connected Successfully!');
        console.log(`📡 Host: gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000`);
        console.log(`🗄️  Database: sys`);
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ TiDB Connection Failed:', error.message);
        return false;
    }
}

// ============================================================
// INIT TABLES
// ============================================================
async function initTables() {
    try {
        // Users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                email VARCHAR(255) UNIQUE NOT NULL,
                username VARCHAR(100) NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role VARCHAR(50) DEFAULT 'user',
                status ENUM('pending', 'active', 'rejected') DEFAULT 'pending',
                permissions JSON DEFAULT '{}',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_email (email),
                INDEX idx_status (status)
            )
        `);
        console.log('✅ Users table ready');

        // Audit logs table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS audit_logs (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT,
                action VARCHAR(100),
                details JSON,
                ip_address VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
                INDEX idx_user_id (user_id),
                INDEX idx_created_at (created_at)
            )
        `);
        console.log('✅ Audit logs table ready');

        return true;
    } catch (error) {
        console.error('❌ Table init failed:', error.message);
        return false;
    }
}

module.exports = {
    pool,
    testConnection,
    initTables
};
