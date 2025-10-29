/*
* =============================================================
* LIVE CRICKET BACKEND PROXY (v5 API) - Corrected Featured Live (POST)
* =============================================================
*
* This Node.js server acts as a secure "middle-man" for the
* Cricket Live Line v5 API (apicricketchampion.in).
*
* It reads your secret API token from environment variables,
* receives requests from your frontend, and forwards them
* to the real API, adding your token securely.
*
* - Uses POST /liveMatch/ with match_id for featured top section (via GET /api/v5/featured-live).
* - Uses GET /liveMatchList/ for the "Live" tab list (via GET /api/v5/live).
*/

const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Ensure you have node-fetch installed (npm install node-fetch@2) - Use v2 for require
const { URLSearchParams } = require('url'); // Needed for URL-encoded form data

const app = express();
const port = process.env.PORT || 3000;

// --- Your Secret API Key ---
// Ensure this environment variable is set in your hosting (e.g., Render.com)
const CRICKET_V5_TOKEN = process.env.CRICKET_V5_TOKEN;

// --- CORRECT API Base URL (Confirmed by Provider/Docs) ---
const API_BASE_URL = 'https://apicricketchampion.in/apiv5';

// --- Middleware ---
app.use(cors()); // Enable CORS for requests from your frontend
app.use(express.json()); // Parse JSON request bodies

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
    res.send('Cricket API Proxy v5 is running.');
});

/**
 * --- Generic Fetch Function ---
 * Handles fetching data from the external API, adding the token,
 * checking for errors, and sending the response back to the frontend.
 * UPDATED: Added options parameter to support POST method.
 */
async function fetchFromApi(res, apiUrl, endpointName, fetchOptions = {}) { // Added fetchOptions parameter
    if (!CRICKET_V5_TOKEN) {
        console.error(`[${endpointName}] API Token (CRICKET_V5_TOKEN) is not configured on the server.`);
        return res.status(500).json({ error: 'API token is not configured on the server. Set CRICKET_V5_TOKEN.' });
    }

    console.log(`[${endpointName}] Constructing API URL: ${apiUrl}`);

    // --- Define Default Request Options with Headers ---
    const defaultOptions = {
        method: 'GET', // Default to GET
        headers: {
            'Accept': 'application/json', // Request JSON response
            'User-Agent': 'NodeFetchProxy/1.0' // Identify the client
        }
    };

    // Merge default options with any specific options passed (like method, body, content-type)
    const requestOptions = {
        ...defaultOptions,
        ...fetchOptions, // Override defaults if provided
        headers: { // Ensure headers are merged correctly
            ...defaultOptions.headers,
            ...(fetchOptions.headers || {})
        }
    };
    // --- End Request Options ---

    try {
        console.log(`[${endpointName}] Attempting fetch to: ${apiUrl} with method ${requestOptions.method} and headers:`, requestOptions.headers);
        if (requestOptions.body) {
            console.log(`[${endpointName}] Request body:`, requestOptions.body);
        }

        const apiResponse = await fetch(apiUrl, requestOptions); // Pass merged options

        // Check if the response status is OK (2xx range)
        if (!apiResponse.ok) {
            // Try to get more details from the response body if it's an error
            let errorBody = await apiResponse.text(); // Read as text first
            try {
                errorBody = JSON.parse(errorBody); // Try parsing as JSON
            } catch (e) {
                // Keep as text if not JSON
            }
            // Log the detailed error
            console.error(`[${endpointName}] API Error (${apiUrl}): Status ${apiResponse.status}, Body:`, errorBody);
            // Send back the specific status code from the API
            return res.status(apiResponse.status).json({
                error: `API error: ${apiResponse.status} ${apiResponse.statusText}`,
                details: errorBody // Include details if available
            });
        }

        // If response is OK, parse JSON and send to frontend
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
        // Handle network errors (like timeouts, DNS issues)
        console.error(`[${endpointName}] Network Error (${apiUrl}):`, error.message);
        res.status(500).json({ error: `Failed to fetch ${endpointName}. Reason: ${error.message}` });
    }
}

// =============================================================
// --- API Proxy Endpoints ---
// =============================================================

/**
 * @route   GET /api/v5/featured-live
 * @desc    Fetches the single main live match for the top section using POST
 * NOTE: This proxy endpoint is GET, but it calls the external API using POST.
 * NOTE: Currently uses a hardcoded match_id. Needs updating later.
 */
app.get('/api/v5/featured-live', (req, res) => {
    // Path: /liveMatch/{token} - requires POST with match_id
    const API_URL = `${API_BASE_URL}/liveMatch/${CRICKET_V5_TOKEN}`;

    // --- Prepare POST data ---
    // TODO: Get match_id dynamically from the frontend request in the future
    const matchId = "5484"; // Hardcoded based on example
    const params = new URLSearchParams();
    params.append('match_id', matchId);
    // --- End POST data prep ---

    const postOptions = {
        method: 'POST',
        body: params, // Send as URL-encoded form data
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded' // Set content type
        }
    };

    fetchFromApi(res, API_URL, 'featured-live-post', postOptions); // Pass POST options
});


/**
 * @route   GET /api/v5/live
 * @desc    Fetches the list of all live matches for the "Live" tab using GET
 */
app.get('/api/v5/live', (req, res) => {
    // Path: /liveMatchList/{token} - uses GET
    const API_URL = `${API_BASE_URL}/liveMatchList/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'live-list'); // No extra options needed for GET
});

// --- Other endpoints remain the same (using GET) ---

/**
 * @route   GET /api/v5/upcoming
 * @desc    Fetches upcoming matches
 */
app.get('/api/v5/upcoming', (req, res) => {
    // Correct Path: /upcomingMatches/{token}
    const API_URL = `${API_BASE_URL}/upcomingMatches/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'upcoming');
});

/**
 * @route   GET /api/v5/recent
 * @desc    Fetches recent matches
 */
app.get('/api/v5/recent', (req, res) => {
    // Correct Path: /recentMatches/{token}
    const API_URL = `${API_BASE_URL}/recentMatches/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'recent');
});


/**
 * @route   GET /api/v5/series
 * @desc    Fetches list of series
 */
app.get('/api/v5/series', (req, res) => {
    // Correct Path: /seriesList/{token}
    const API_URL = `${API_BASE_URL}/seriesList/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'series');
});

/**
 * @route   GET /api/v5/news
 * @desc    Fetches latest news
 */
app.get('/api/v5/news', (req, res) => {
    // Correct Path: /news/{token}
    const API_URL = `${API_BASE_URL}/news/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'news');
});

/**
 * @route   GET /api/v5/points-table/:seriesId
 * @desc    Fetches points table using seriesId as query param
 */
app.get('/api/v5/points-table/:seriesId', (req, res) => {
    const { seriesId } = req.params;
    if (!seriesId) return res.status(400).json({ error: 'Series ID is required.' });

    // Path: /pointsTable/{token} with series_id as query param
    const API_URL = `${API_BASE_URL}/pointsTable/${CRICKET_V5_TOKEN}?series_id=${seriesId}`;
    console.log(`[points-table] Testing with query param: series_id=${seriesId}`);
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

    // Correct Path: /matchInfoByMatchId/{matchId}/{token}
    const API_URL = `${API_BASE_URL}/matchInfoByMatchId/${matchId}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'match-info');
});

/**
 * @route   GET /api/v5/rankings
 * @desc    Fetches T20 team rankings
 */
app.get('/api/v5/rankings', (req, res) => {
    // Correct Path: /teamRanking/{format}/{token} (format is t20, odi, test)
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

