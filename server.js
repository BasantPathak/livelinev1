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
// Added the /apiv5 prefix as discovered from the Postman docs
const API_BASE_URL = 'https://apicricketchampion.in/apiv5'; // Updated URL

// --- Middleware ---
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
    res.send('Cricket API Proxy is running.');
});

/**
 * --- Generic Fetch Function ---
 * A simple wrapper to handle the fetch, check for errors, and parse JSON
 */
async function fetchFromApi(res, apiUrl) {
    if (!CRICKET_V5_TOKEN) {
        return res.status(500).json({ error: 'API token is not configured on the server. Set CRICKET_V5_TOKEN.' });
    }

    console.log(`Proxying request to: ${apiUrl}`); // Log the URL being requested

    try {
        const apiResponse = await fetch(apiUrl);
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error(`API Error Response Text: ${errorText}`); // Log the raw error
            throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText}`);
        }
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        console.error(`Error fetching from ${apiUrl}:`, error.message);
        console.error(error);
        res.status(500).json({ error: `Failed to fetch data. Reason: ${error.message}` });
    }
}

// --- API Endpoints ---
// Each endpoint now builds the correct URL structure

/**
 * @route   GET /api/v5/live
 * @desc    Fetches live matches
 */
app.get('/api/v5/live', (req, res) => {
    const API_URL = `${API_BASE_URL}/live-matches/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL);
});

/**
 * @route   GET /api/v5/upcoming
 * @desc    Fetches upcoming matches
 */
app.get('/api/v5/upcoming', (req, res) => {
    const API_URL = `${API_BASE_URL}/upcoming-matches/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL);
});

/**
 * @route   GET /api/v5/series
 * @desc    Fetches list of series
 */
app.get('/api/v5/series', (req, res) => {
    const API_URL = `${API_BASE_URL}/series-list/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL);
});

/**
 * @route   GET /api/v5/points-table/:seriesId
 * @desc    Fetches points table for a specific series
 */
// Corrected the typo in the route path from /api/vV5 to /api/v5
app.get('/api/v5/points-table/:seriesId', (req, res) => {
    const { seriesId } = req.params;
    if (!seriesId) {
        return res.status(400).json({ error: 'Series ID is required.' });
    }
    const API_URL = `${API_BASE_URL}/series-points-table/${seriesId}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL);
});

/**
 * @route   GET /api/v5/news
 * @desc    Fetches latest news
 */
app.get('/api/v5/news', (req, res) => {
    const API_URL = `${API_BASE_URL}/news/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL);
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
    const API_URL = `${API_BASE_URL}/match-scorecard/${matchId}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL);
});


// Start the server
app.listen(port, () => {
    console.log(`Cricket v5 Proxy server running on http://localhost:${port}`);
});

