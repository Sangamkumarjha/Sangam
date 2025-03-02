const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MySQL Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'sakshi_rail_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test MySQL connection
pool.getConnection()
  .then(() => console.log('Connected to MySQL'))
  .catch(err => console.error('MySQL connection error:', err));

// Get all bills
app.get('/api/bills', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM sakshi_rail_db_bills');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching bills', error });
  }
});

// Get bills by company and date range
app.get('/api/bills/search', async (req, res) => {
  try {
    const { company, startDate, endDate } = req.query;
    let query = 'SELECT * FROM sakshi_rail_db_bills WHERE 1=1';
    const params = [];

    if (company) {
      query += ' AND company = ?';
      params.push(company);
    }
    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }
    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: 'Error searching bills', error });
  }
});

// Create a new bill
app.post('/api/bills', async (req, res) => {
  try {
    const { company, date, invoiceNo, origin, destination, weight, rate, mode, trainNo, chargeType, freightCharge, loadingCharge, deliveryCharge, loadingDeliveryCharge } = req.body;
    
    const baseAmount = parseFloat(rate) * parseFloat(weight);
    const additionalCharges = [
      freightCharge || 0,
      loadingCharge || 0,
      deliveryCharge || 0,
      loadingDeliveryCharge || 0,
    ].reduce((sum, charge) => sum + charge, 0);

    const totalAmount = baseAmount + additionalCharges;

    const [result] = await pool.query(
      `INSERT INTO sakshi_rail_db_bills 
      (company, date, invoiceNo, origin, destination, weight, rate, mode, trainNo, chargeType, freightCharge, loadingCharge, deliveryCharge, loadingDeliveryCharge, totalAmount) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [company, date, invoiceNo, origin, destination, weight, rate, mode, trainNo, chargeType || null, freightCharge || 0, loadingCharge || 0, deliveryCharge || 0, loadingDeliveryCharge || 0, totalAmount]
    );

    res.json({ id: result.insertId, ...req.body, totalAmount });
  } catch (error) {
    res.status(500).json({ message: 'Error creating bill', error });
  }
});

//generat invoice
app.get("/api/generate-invoice", async (req, res) => {
  try {
    const lastInvoice = await db.query("SELECT MAX(invoiceNo) AS last FROM bills");
    const newInvoiceNo = lastInvoice[0].last ? parseInt(lastInvoice[0].last) + 1 : 1001;
    res.json({ invoiceNo: newInvoiceNo });
  } catch (err) {
    res.status(500).json({ message: "Error generating invoice", error: err });
  }
});


// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
