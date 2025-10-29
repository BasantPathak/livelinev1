/*
* =============================================================
* LIVE CRICKET BACKEND PROXY (v5 API)
* =============================================================
*
* This Node.js server acts as a secure "middle-man" for the
* Cricket Live Line v5 API.
*
* It reads your secret API token from environment variables,
* receives requests from your frontend, and forwards them
* to the real API, adding your token securely.
*
*/

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// --- Your Secret API Key ---
// Get the v5 token from environment variables.
const CRICKET_V5_TOKEN = process.env.CRICKET_V5_TOKEN;

// --- !! SECOND FIX !! ---
// The correct domain is api.cricliveline.live (not cricketliveline)
const API_BASE_URL = 'https://api.cricliveline.live/api/v5';
// --- !! END FIX !! ---

// --- Middleware ---
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
    res.send('Cricket API Proxy is running.');
});

// --- Main API Proxy Function ---
async function proxyRequest(req, res, apiPath) {
    if (!CRICKET_V5_TOKEN) {
        return res.status(500).json({ error: 'API token is not configured on the server. Set CRICKET_V5_TOKEN.' });
    }

    // Append the token to the path. If the path already has query params, use &
    const separator = apiPath.includes('?') ? '&' : '?';
    const API_URL = `${API_BASE_URL}${apiPath}${separator}token=${CRICKET_V5_TOKEN}`;

    try {
        const apiResponse = await fetch(API_URL);
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            throw new Error(`API error: ${apiResponse.statusText} - ${errorText}`);
        }
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        console.error(`Error fetching from ${apiPath}:`, error.message);
        res.status(500).json({ error: `Failed to fetch data from ${apiPath}.` });
    }
}

// --- API Endpoints ---

/**
 * @route   GET /api/v5/live
 * @desc    Fetches live matches
 */
app.get('/api/v5/live', (req, res) => {
    proxyRequest(req, res, '/live-matches');
});

/**
 * @route   GET /api/v5/upcoming
 * @desc    Fetches upcoming matches
 */
app.get('/api/v5/upcoming', (req, res) => {
    proxyRequest(req, res, '/upcoming-matches');
});

/**
 * @route   GET /api/v5/series
 * @desc    Fetches list of series
 */
app.get('/api/v5/series', (req, res) => {
    proxyRequest(req, res, '/series-list');
});

/**
 * @route   GET /api/v5/points-table/:seriesId
 * @desc    Fetches points table for a specific series
 */
app.get('/api/v5/points-table/:seriesId', (req, res) => {
    const { seriesId } = req.params;
    if (!seriesId) {
        return res.status(400).json({ error: 'Series ID is required.' });
    }
    // Note: The API path already has a query param, so proxyRequest will use '&'
    proxyRequest(req, res, `/series-points-table?series_id=${seriesId}`);
});

/**
 * @route   GET /api/v5/news
 * @desc    Fetches latest news
 */
app.get('/api/v5/news', (req, res) => {
    proxyRequest(req, res, '/news');
});

/**
 * @route   GET /api/v5/scorecard/:matchId
 * @desc    Fetches full scorecard for a match
 */
app.get('/api/v5/scorecard/:matchId', (req, res) => {
    const { matchId } = req.params;
    if (!matchId) {
        return res.status(400).json({ error: 'Match ID is required.' });
    }
    // Note: The API path already has a query param, so proxyRequest will use '&'
    proxyRequest(req, res, `/match-scorecard?match_id=${matchId}`);
});


// Start the server
app.listen(port, () => {
    console.log(`Cricket v5 Proxy server running on http://localhost:${port}`);
});



