/**
 * =========================================================================
 * MANSTAT MODERN - APPLICATION SERVER ENTRYPOINT (server.js)
 * =========================================================================
 * Production-ready Express Server
 * Serves the original Steam Dark UI with zero latency and full cloud compatibility.
 * =========================================================================
 */
const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRoutes = require('./src/api/routes');
const { getCompiledPage } = require('./src/utils/templateRenderer');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static Assets
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);

// Web Pages (Compiled from original templates with gas-bridge.js auto-injected)
app.get('/', (req, res) => {
  try {
    const html = getCompiledPage('Index');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[Page Error] /:', err);
    res.status(500).send('Error loading page: ' + err.message);
  }
});

app.get('/admin', (req, res) => {
  try {
    const html = getCompiledPage('Admin');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('[Page Error] /admin:', err);
    res.status(500).send('Error loading admin page: ' + err.message);
  }
});

// Fallback for Vercel Serverless & Local development
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`  MANSTAT MODERN APPLICATION SERVER RUNNING           `);
    console.log(`======================================================`);
    console.log(`  > Local URL:   http://localhost:${PORT}`);
    console.log(`  > Admin URL:   http://localhost:${PORT}/admin`);
    console.log(`  > Status:      Ready for Online Cloud Deployment    `);
    console.log(`======================================================\n`);
  });
}

module.exports = app;
