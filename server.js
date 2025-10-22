/*
* =============================================================
* LIVE CRICKET SCORE BACKEND PROXY
* =============================================================
*
* This Node.js server fixes the CORS error by acting as a
* "middle-man" between your HTML page and the APIs.
* It also securely hides your API keys.
*
* This file should be uploaded to your Hostinger plan
* inside the `cricket-backend` folder.
*
*/

const express = require('express');
const cors = require('cors');
// Use require('node-fetch') if on Node.js v16 or earlier
// For Node.js v18+, 'fetch' is available globally.
// We'll use require('node-fetch') for broad compatibility.
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// --- Your Secret API Keys ---
// Get keys from environment variables. DO NOT paste them here.
const SPORTMONKS_API_KEY = process.env.SPORTMONKS_KEY;
const GEMINI_API_KEY = process.env.GEMINI_KEY;

// --- Middleware ---
// Enable CORS for all requests. This allows your frontend,
// even on a different domain, to call this server.
app.use(cors());
// Middleware to parse JSON bodies (for the news endpoint)
app.use(express.json());

// --- API Endpoints ---

/**
 * @route   GET /api/getscores
 * @desc    Fetches live cricket scores from Sportmonks
 */
app.get('/api/getscores', async (req, res) => {
    if (!SPORTMONKS_API_KEY) {
        return res.status(500).json({ error: 'Sportmonks API key is not configured on the server.' });
    }

    const API_URL = `https://cricket.sportmonks.com/api/v2.0/livescores?api_token=${SPORTMONKS_API_KEY}&include=localteam,visitorteam,scoreboards,batting,bowling,runs,lineup,stage`;

    try {
        const apiResponse = await fetch(API_URL);
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`Sportmonks API error: ${apiResponse.statusText} - ${errorText}`);
        }
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching from Sportmonks:', error.message);
        res.status(500).json({ error: 'Failed to fetch live scores.' });
    }
});

/**
 * @route   POST /api/getnews
 * @desc    Fetches breaking news from the Gemini API
 */
app.post('/api/getnews', async (req, res) => {
    if (!GEMINI_API_KEY) {
        return res.status(500).json({ error: 'Gemini API key is not configured on the server.' });
    }
    
    // The frontend will send the payload, we just forward it
    const payload = req.body; 
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${GEMINI_API_KEY}`;

    try {
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        
        if (!apiResponse.ok) {
            const errorBody = await apiResponse.text();
            console.error('Gemini API Error Body:', errorBody);
            throw new Error(`Gemini API error: ${apiResponse.statusText}`);
        }
        
        const data = await apiResponse.json();
        res.json(data);
        
    } catch (error) {
        console.error('Error fetching from Gemini:', error.message);
        res.status(500).json({ error: 'Failed to fetch news.' });
    }
});


// Start the server
app.listen(port, () => {
    console.log(`Proxy server running on http://localhost:${port}`);
});

