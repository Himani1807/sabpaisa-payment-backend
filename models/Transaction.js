const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class TransactionModel {
  constructor() {
    this.db = new sqlite3.Database(process.env.DB_PATH || './database.sqlite');
    this.initDB();
  }

  initDB() {
    const createTable = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clientTxnId TEXT UNIQUE NOT NULL,
        sabpaisaTxnId TEXT,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'INR',
        customerName TEXT NOT NULL,
        customerEmail TEXT NOT NULL,
        customerMobile TEXT NOT NULL,
        status TEXT DEFAULT 'PENDING',
        paymentMode TEXT,
        bankRefNumber TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    
    this.db.run(createTable, (err) => {
      if (err) {
        console.error('Error creating transactions table:', err);
      } else {
        console.log('✅ Transactions table ready');
      }
    });
  }

  create(transactionData) {
    return new Promise((resolve, reject) => {
      const { clientTxnId, amount, customerName, customerEmail, customerMobile } = transactionData;
      
      const sql = `
        INSERT INTO transactions (clientTxnId, amount, customerName, customerEmail, customerMobile)
        VALUES (?, ?, ?, ?, ?)
      `;
      
      this.db.run(sql, [clientTxnId, amount, customerName, customerEmail, customerMobile], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, clientTxnId });
        }
      });
    });
  }

  updateStatus(clientTxnId, updates) {
    return new Promise((resolve, reject) => {
      const { status, sabpaisaTxnId, paymentMode, bankRefNumber } = updates;
      
      const sql = `
        UPDATE transactions 
        SET status = ?, sabpaisaTxnId = ?, paymentMode = ?, bankRefNumber = ?, updatedAt = CURRENT_TIMESTAMP
        WHERE clientTxnId = ?
      `;
      
      this.db.run(sql, [status, sabpaisaTxnId, paymentMode, bankRefNumber, clientTxnId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  findByClientTxnId(clientTxnId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM transactions WHERE clientTxnId = ?`;
      
      this.db.get(sql, [clientTxnId], (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
}

module.exports = new TransactionModel();