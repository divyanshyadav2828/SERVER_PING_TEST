const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3055;

// --- FIX: Middleware to parse JSON bodies ---
app.use(express.json()); 
// --------------------------------------------

// Middleware to serve static files (CSS, JS) from 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount API routes
app.use('/api', apiRoutes);

// Serve the main HTML view
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n-----------------------------------------`);
    console.log(`🚀 LAN Monitor running!`);
    console.log(`📡 Local:   http://localhost:${PORT}`);
    console.log(`-----------------------------------------\n`);
});
