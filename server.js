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

// --- CORRECTED API Base URL ---
const API_BASE_URL = 'https://apicricketchampion.in/api/v5'; // Updated domain

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

    console.log(`Proxying request to: ${API_URL}`); // Log the URL being requested

    try {
        const apiResponse = await fetch(API_URL);
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error(`API Error Response Text: ${errorText}`); // Log the raw error
            throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText}`);
        }
        const data = await apiResponse.json();
        res.json(data);
    } catch (error)
    {
        console.error(`Error fetching from ${apiPath}:`, error.message);
        // Log the full error object for more details, especially for network errors
        console.error(error);
        res.status(500).json({ error: `Failed to fetch data from ${apiPath}. Reason: ${error.message}` });
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
    proxyRequest(req, res, `/match-scorecard?match_id=${matchId}`);
});


// Start the server
app.listen(port, () => {
    console.log(`Cricket v5 Proxy server running on http://localhost:${port}`);
});

