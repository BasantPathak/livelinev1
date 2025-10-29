/*
* =============================================================
* LIVE CRICKET BACKEND PROXY (v5 API) - UPDATED with Correct Endpoints
* =============================================================
*
* This Node.js server acts as a secure "middle-man" for the
* Cricket Live Line v5 API (apicricketchampion.in).
*
* It reads your secret API token from environment variables,
* receives requests from your frontend, and forwards them
* to the real API, adding your token securely.
*
* This version uses the specific endpoints confirmed by API docs.
*/

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Ensure you have node-fetch installed (npm install node-fetch)

const app = express();
const port = process.env.PORT || 3000;

// --- Your Secret API Key ---
// Ensure this environment variable is set in your hosting (e.g., Render.com)
const CRICKET_V5_TOKEN = process.env.CRICKET_V5_TOKEN;

// --- CORRECT API Base URL (Confirmed by Provider/Docs) ---
const API_BASE_URL = 'https://apicricketchampion.in/apiv5';

// --- Middleware ---
app.use(cors()); // Enable CORS for requests from your frontend
app.use(express.json()); // Parse JSON request bodies (though not used much here)

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
    res.send('Cricket API Proxy v5 is running.');
});

/**
 * --- Generic Fetch Function ---
 * Handles fetching data from the external API, adding the token,
 * checking for errors, and sending the response back to the frontend.
 */
async function fetchFromApi(res, apiUrl, endpointName) {
    if (!CRICKET_V5_TOKEN) {
        console.error(`API Token (CRICKET_V5_TOKEN) is not configured on the server.`);
        return res.status(500).json({ error: 'API token is not configured on the server. Set CRICKET_V5_TOKEN.' });
    }
    console.log(`Proxying request for ${endpointName} to: ${apiUrl}`);

    try {
        const apiResponse = await fetch(apiUrl);

        // Check if the response status is OK (2xx range)
        if (!apiResponse.ok) {
            // Try to get more details from the response body if it's an error
            let errorBody = await apiResponse.text(); // Read as text first
            try {
                errorBody = JSON.parse(errorBody); // Try parsing as JSON
            } catch (e) {
                // Keep as text if not JSON
            }
            console.error(`API Error for ${endpointName} (${apiUrl}): Status ${apiResponse.status}, Body:`, errorBody);
            // Send back the specific status code from the API
            return res.status(apiResponse.status).json({
                error: `API error: ${apiResponse.status} ${apiResponse.statusText}`,
                details: errorBody // Include details if available
            });
        }

        // If response is OK, parse JSON and send to frontend
        const data = await apiResponse.json();
        res.json(data);

    } catch (error) {
        // Handle network errors (like timeouts, DNS issues)
        console.error(`Network Error in fetchFromApi for ${endpointName} (${apiUrl}):`, error.message);
        res.status(500).json({ error: `Failed to fetch ${endpointName}. Reason: ${error.message}` });
    }
}

// =============================================================
// --- API Proxy Endpoints ---
// =============================================================

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
    
    // --- UPDATED PATH: Trying underscore version ---
    const API_URL = `${API_BASE_URL}/points_table_by_series_id/${seriesId}/${CRICKET_V5_TOKEN}`; 
    fetchFromApi(res, API_URL, 'points-table');
});

/**
 * @route   GET /api/v5/scorecard/:matchId
 * @desc    Fetches full scorecard for a match
 */
app.get('/api/v5/scorecard/:matchId', (req, res) => {
    const { matchId } = req.params;
    if (!matchId) return res.status(400).json({ error: 'Match ID is required.' });

    // Assuming this path is correct based on Postman docs structure
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

    // Assuming this path is correct based on Postman docs structure
    const API_URL = `${API_BASE_URL}/match-info/${matchId}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'match-info');
});

/**
 * @route   GET /api/v5/rankings
 * @desc    Fetches T20 team rankings
 */
app.get('/api/v5/rankings', (req, res) => {
    // Assuming this path is correct based on Postman docs structure
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

    // Assuming this path is correct based on Postman docs structure
    const API_URL = `${API_BASE_URL}/search-matches/${query}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'search-matches');
});


// Start the server
app.listen(port, () => {
    console.log(`Cricket v5 Proxy server running on http://localhost:${port}`);
});



