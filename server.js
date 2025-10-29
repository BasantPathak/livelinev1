/*
* =============================================================
* LIVE CRICKET BACKEND PROXY (v5 API) - Split Live Endpoints
* =============================================================
*
* This Node.js server acts as a secure "middle-man" for the
* Cricket Live Line v5 API (apicricketchampion.in).
*
* It reads your secret API token from environment variables,
* receives requests from your frontend, and forwards them
* to the real API, adding your token securely.
*
* - Uses /liveMatch/ for the featured top section.
* - Uses /liveMatchList/ for the "Live" tab list.
*/

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Use v2 for require (npm install node-fetch@2)

const app = express();
const port = process.env.PORT || 3000;

// --- Your Secret API Key ---
const CRICKET_V5_TOKEN = process.env.CRICKET_V5_TOKEN;

// --- CORRECT API Base URL ---
const API_BASE_URL = 'https://apicricketchampion.in/apiv5';

// --- Middleware ---
app.use(cors());
app.use(express.json());

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
    res.send('Cricket API Proxy v5 is running.');
});

/**
 * --- Generic Fetch Function ---
 */
async function fetchFromApi(res, apiUrl, endpointName) {
    if (!CRICKET_V5_TOKEN) {
        console.error(`[${endpointName}] API Token (CRICKET_V5_TOKEN) is not configured on the server.`);
        return res.status(500).json({ error: 'API token is not configured on the server. Set CRICKET_V5_TOKEN.' });
    }
    
    console.log(`[${endpointName}] Constructing API URL: ${apiUrl}`); 
    
    const requestOptions = {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'User-Agent': 'NodeFetchProxy/1.0'
        }
    };

    try {
        console.log(`[${endpointName}] Attempting fetch from: ${apiUrl} with headers:`, requestOptions.headers);
        const apiResponse = await fetch(apiUrl, requestOptions);

        if (!apiResponse.ok) {
            let errorBody = await apiResponse.text();
            try { errorBody = JSON.parse(errorBody); } catch (e) { /* Keep as text */ }
            console.error(`[${endpointName}] API Error (${apiUrl}): Status ${apiResponse.status}, Body:`, errorBody);
            return res.status(apiResponse.status).json({
                error: `API error: ${apiResponse.status} ${apiResponse.statusText}`,
                details: errorBody
            });
        }

        const data = await apiResponse.json();
        console.log(`[${endpointName}] Successfully fetched data from: ${apiUrl}`);
        // Add a check for the specific "Something went wrong" message from the API
        if (data.status === false && data.msg === "Something went wrong.") {
             console.warn(`[${endpointName}] API returned 'Something went wrong.' for ${apiUrl}`);
             // Forward the error but maybe use a slightly different status if needed, e.g., 502 Bad Gateway
             return res.status(502).json(data);
        }
        res.json(data);

    } catch (error) {
        console.error(`[${endpointName}] Network Error (${apiUrl}):`, error.message);
        res.status(500).json({ error: `Failed to fetch ${endpointName}. Reason: ${error.message}` });
    }
}

// =============================================================
// --- API Proxy Endpoints ---
// =============================================================

/**
 * @route   GET /api/v5/featured-live
 * @desc    Fetches the single main live match for the top section
 */
app.get('/api/v5/featured-live', (req, res) => {
    // Path: /liveMatch/{token} - designed to return one match usually
    const API_URL = `${API_BASE_URL}/liveMatch/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'featured-live');
});

/**
 * @route   GET /api/v5/live
 * @desc    Fetches the list of all live matches for the "Live" tab
 */
app.get('/api/v5/live', (req, res) => {
    // Path: /liveMatchList/{token}
    const API_URL = `${API_BASE_URL}/liveMatchList/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'live-list'); // Changed log name slightly
});

// --- Other endpoints remain the same ---

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
 * @desc    Fetches points table
 */
app.get('/api/v5/points-table/:seriesId', (req, res) => {
    const { seriesId } = req.params; 
    if (!seriesId) return res.status(400).json({ error: 'Series ID is required.' });
    
    // Correct Path: /pointTableBySeriesId/{seriesId}/{token} - Using correct casing now
    const API_URL = `${API_BASE_URL}/pointTableBySeriesId/${seriesId}/${CRICKET_V5_TOKEN}`; 
    console.log(`[points-table] Using path: /pointTableBySeriesId/`); // Update log message
    fetchFromApi(res, API_URL, 'points-table');
});

/**
 * @route   GET /api/v5/scorecard/:matchId
 * @desc    Fetches full scorecard for a match
 */
app.get('/api/v5/scorecard/:matchId', (req, res) => {
    const { matchId } = req.params;
    if (!matchId) return res.status(400).json({ error: 'Match ID is required.' });

    // Correct Path: /scorecardByMatchId/{matchId}/{token}
    const API_URL = `${API_BASE_URL}/scorecardByMatchId/${matchId}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'scorecard');
});

/**
 * @route   GET /api/v5/match-info/:matchId
 * @desc    Fetches match info (toss, venue, etc.)
 */
app.get('/api/v5/match-info/:matchId', (req, res) => {
    const { matchId } = req.params;
    if (!matchId) return res.status(400).json({ error: 'Match ID is required.' });

    // Correct Path: /matchInfoByMatchId/{matchId}/{token} - Using correct casing now
    const API_URL = `${API_BASE_URL}/matchInfoByMatchId/${matchId}/${CRICKET_V5_TOKEN}`; 
    fetchFromApi(res, API_URL, 'match-info');
});

/**
 * @route   GET /api/v5/rankings
 * @desc    Fetches T20 team rankings
 */
app.get('/api/v5/rankings', (req, res) => {
    // Correct Path: /teamRanking/{format}/{token}
    const API_URL = `${API_BASE_URL}/teamRanking/t20/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'rankings-t20');
});

/**
 * @route   GET /api/v5/search-matches/:query
 * @desc    Searches for matches by team name
 */
app.get('/api/v5/search-matches/:query', (req, res) => {
    const { query } = req.params;
    if (!query) return res.status(400).json({ error: 'Search query is required.' });

    // Correct Path: /searchMatches/{query}/{token}
    const API_URL = `${API_BASE_URL}/searchMatches/${query}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'search-matches');
});


// Start the server
app.listen(port, () => {
    console.log(`Cricket v5 Proxy server running on http://localhost:${port}`);
});

