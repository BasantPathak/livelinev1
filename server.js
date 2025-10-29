/*
* =============================================================
* LIVE CRICKET BACKEND PROXY (v5 API) - UPDATED with /homeList
* =============================================================
*
* This Node.js server acts as a secure "middle-man" for the
* Cricket Live Line v5 API.
*
* It reads your secret API token from environment variables,
* receives requests from your frontend, and forwards them
* to the real API, adding your token securely.
*
* This version is updated to use the /homeList endpoint for
* live, upcoming, series, and news data, with caching.
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

// --- Simple In-Memory Cache for /homeList ---
let homeListCache = {
    data: null,
    timestamp: 0
};
const CACHE_DURATION = 60000; // 60 seconds (1 minute)

// --- Health Check Endpoint ---
app.get('/', (req, res) => {
    res.send('Cricket API Proxy is running.');
});

/**
 * --- Generic Fetch Function (for Scorecard/Points) ---
 * A simple wrapper to handle the fetch, check for errors, and parse JSON
 * for single-purpose endpoints.
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

/**
 * --- Fetch Function for HomeList (with caching) ---
 * Fetches the main /homeList endpoint and caches the result.
 */
async function getHomeList() {
    const now = Date.now();
    // Check if cache is valid
    if (homeListCache.data && (now - homeListCache.timestamp < CACHE_DURATION)) {
        console.log("Returning /homeList from cache.");
        return homeListCache.data;
    }

    // Cache is invalid or empty, fetch new data
    if (!CRICKET_V5_TOKEN) {
        throw new Error('API token is not configured on the server. Set CRICKET_V5_TOKEN.');
    }
    const API_URL = `${API_BASE_URL}/homeList/${CRICKET_V5_TOKEN}`;
    console.log(`Fetching new data from /homeList: ${API_URL}`);

    try {
        const apiResponse = await fetch(API_URL);
        if (!apiResponse.ok) {
            const errorText = await apiResponse.text();
            console.error(`API Error for /homeList (${API_URL}): ${errorText}`);
            throw new Error(`API error: ${apiResponse.status} ${apiResponse.statusText}`);
        }
        const data = await apiResponse.json();
        
        // Check if the response is what we expect (it has a .data property)
        if (!data || !data.data) {
            console.error("Invalid /homeList response structure:", data);
            throw new Error("Invalid response structure from /homeList API.");
        }

        // Update cache
        homeListCache = {
            data: data.data, // Store the .data object, as that's what we need
            timestamp: now
        };
        console.log("Successfully fetched and cached /homeList data.");
        return homeListCache.data;
    } catch (error) {
        console.error("Error in getHomeList:", error.message);
        // If fetch fails, return old cache if it exists to avoid breaking the site
        if (homeListCache.data) {
            console.warn("Returning stale /homeList cache due to fetch error.");
            return homeListCache.data;
        }
        // If no cache exists and fetch fails, throw the error
        throw error;
    }
}

// --- API Endpoints ---

/**
 * @route   GET /api/v5/live
 * @desc    Fetches live matches from homeList
 */
app.get('/api/v5/live', async (req, res) => {
    try {
        const homeData = await getHomeList();
        res.json({ data: homeData.live_matches || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/v5/upcoming
 * @desc    Fetches upcoming matches from homeList
 */
app.get('/api/v5/upcoming', async (req, res) => {
    try {
        const homeData = await getHomeList();
        res.json({ data: homeData.upcoming_matches || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/v5/series
 * @desc    Fetches list of series from homeList
 */
app.get('/api/v5/series', async (req, res) => {
    try {
        const homeData = await getHomeList();
        res.json({ data: homeData.series_list || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/v5/news
 * @desc    Fetches latest news from homeList
 */
app.get('/api/v5/news', async (req, res) => {
    try {
        const homeData = await getHomeList();
        res.json({ data: homeData.news || [] });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @route   GET /api/v5/points-table/:seriesId
 * @desc    Fetches points table for a specific series (This is a separate endpoint)
 */
app.get('/api/v5/points-table/:seriesId', (req, res) => {
    const { seriesId } = req.params;
    if (!seriesId) return res.status(400).json({ error: 'Series ID is required.' });
    
    const API_URL = `${API_BASE_URL}/series-points-table/${seriesId}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'points-table');
});

/**
 * @route   GET /api/v5/scorecard/:matchId
 * @desc    Fetches full scorecard for a match (This is a separate endpoint)
 */
app.get('/api/v5/scorecard/:matchId', (req, res) => {
    const { matchId } = req.params;
    if (!matchId) return res.status(400).json({ error: 'Match ID is required.' });

    const API_URL = `${API_BASE_URL}/match-scorecard/${matchId}/${CRICKET_V5_TOKEN}`;
    fetchFromApi(res, API_URL, 'scorecard');
});


// Start the server
app.listen(port, () => {
    console.log(`Cricket v5 Proxy server running on http://localhost:${port}`);
});

