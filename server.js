/*
* =============================================================
* LIVE CRICKET BACKEND PROXY (v5 API) - UPDATED with Specific Endpoints
* =============================================================
*
* This Node.js server acts as a secure "middle-man" for the
* Cricket Live Line v5 API.
*
* It reads your secret API token from environment variables,
* receives requests from your frontend, and forwards them
* to the real API, adding your token securely.
*
* This version is updated to use the correct, specific
* endpoints for each data type (e.g., /liveMatchList).
*/

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// --- Your Secret API Key ---
const CRICKET_V5_TOKEN = process.env.CRICKET_V5_TOKEN;

// --- CORRECTED API Base URL ---
const API_BASE_URL = 'https://apicricketchampion.in/apiv5';

// --- Middleware ---
app.use(cors()); // Enable CORS
app.use(express.json()); // Parse JSON bodies

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
    res.send('Cricket API Proxy is running.');
});

/**
 * --- Generic Fetch Function (for all endpoints) ---
 * A simple wrapper to handle the fetch, check for errors, and parse JSON.
 */
async function fetchFromApi(res, apiUrl, endpointName) {
    if (!CRICKET_V5_TOKEN) {
        return res.status(500).json({ error: 'API token is not configured on the server. Set CRICKET_V5_TOKEN.' });
    }
    console.log(`Proxying request for ${endpointName} to: ${apiUrl}`);

    try {
        const apiResponse = await fetch(apiUrl);
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error(`API Error for ${endpointName} (${apiUrl}): ${errorText}`);
            throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText}`);
        }
        const data = await apiResponse.json();
        res.json(data);
    } catch (error) {
        console.error(`Error in fetchFromApi for ${endpointName}:`, error.message);
        res.status(500).json({ error: `Failed to fetch ${endpointName}. Reason: ${error.message}` });
    }
}

// --- API Endpoints ---
// Each endpoint now calls its own dedicated API path.

/**
 * @route   GET /api/v5/live
 * @desc    Fetches live matches
 */
app.get('/api/v5/live', (req, res) => {
    const API_URL = `${API_BASE_URL}/liveMatchList/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'live');
});

/**
 * @route   GET /api/v5/upcoming
 * @desc    Fetches upcoming matches
 */
app.get('/api/v5/upcoming', (req, res) => {
    const API_URL = `${API_BASE_URL}/upcomingMatches/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'upcoming');
});

/**
 * @route   GET /api/v5/recent
 * @desc    Fetches recent matches
 */
app.get('/api/v5/recent', (req, res) => {
    const API_URL = `${API_BASE_URL}/recentMatches/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'recent');
});


/**
 * @route   GET /api/v5/series
 * @desc    Fetches list of series
 */
app.get('/api/v5/series', (req, res) => {
    const API_URL = `${API_BASE_URL}/seriesList/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'series');
});

/**
 * @route   GET /api/v5/news
 * @desc    Fetches latest news
 */
app.get('/api/v5/news', (req, res) => {
    // Using the /news endpoint from the Postman docs
    const API_URL = `${API_BASE_URL}/news/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'news');
});

/**
 * @route   GET /api/v5/points-table/:seriesId
 * @desc    Fetches points table for a specific series
 */
app.get('/api/v5/points-table/:seriesId', (req, res) => {
    const { seriesId } = req.params;
    if (!seriesId) return res.status(400).json({ error: 'Series ID is required.' });
    
    // Using the /series-points-table endpoint from the Postman docs
    const API_URL = `${API_BASE_URL}/series-points-table/${seriesId}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'points-table');
});

/**
 * @route   GET /api/v5/scorecard/:matchId
 * @desc    Fetches full scorecard for a match
 */
app.get('/api/v5/scorecard/:matchId', (req, res) => {
    const { matchId } = req.params;
    if (!matchId) return res.status(400).json({ error: 'Match ID is required.' });

    // Using the /match-scorecard endpoint from the Postman docs
    const API_URL = `${API_BASE_URL}/match-scorecard/${matchId}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'scorecard');
});

/**
 * @route   GET /api/v5/match-info/:matchId
 * @desc    Fetches match info (toss, venue, etc.)
 */
app.get('/api/v5/match-info/:matchId', (req, res) => {
    const { matchId } = req.params;
    if (!matchId) return res.status(400).json({ error: 'Match ID is required.' });

    const API_URL = `${API_BASE_URL}/match-info/${matchId}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'match-info');
});

/**
 * @route   GET /api/v5/rankings
 * @desc    Fetches T20 team rankings
 */
app.get('/api/v5/rankings', (req, res) => {
    // We will fetch T20 rankings as a default
    const API_URL = `${API_BASE_URL}/team-ranking/t20/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'rankings-t20');
});

/**
 * @route   GET /api/v5/search-matches/:query
 * @desc    Searches for matches by team name
 */
app.get('/api/v5/search-matches/:query', (req, res) => {
    const { query } = req.params;
    if (!query) return res.status(400).json({ error: 'Search query is required.' });

    const API_URL = `${API_BASE_URL}/search-matches/${query}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'search-matches');
});


// Start the server
app.listen(port, () => {
    console.log(`Cricket v5 Proxy server running on http://localhost:${port}`);
});

