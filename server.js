// server.js

const express = require('express');
const { GoogleGenAI } = require('@google/genai');

// --- START: LOCAL DEVELOPMENT CONFIGURATION ---
// This part is for local testing (reading .env and setting port)
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config(); 
}
const port = process.env.PORT || 3000;
// --- END: LOCAL DEVELOPMENT CONFIGURATION ---


const app = express();

// Initialize the GoogleGenAI client using the secure environment variable
const apiKey = process.env.GEMINI_API_KEY;

// 🛑 CRITICAL FIX FOR VERCEL: 
// REMOVE the process.exit(1) block entirely. 
// Vercel handles the API Key failure gracefully, but crashing the function 
// with process.exit(1) leads to the 500 FUNCTION_INVOCATION_FAILED error.
if (!apiKey) {
    console.error("WARNING: GEMINI_API_KEY not found. API calls will fail.");
    // Do NOT call process.exit(1) here for Vercel.
}
const ai = new GoogleGenAI(apiKey);


// Middleware to parse incoming JSON request bodies (increased limit for image data)
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// 1. FAIL-SAFE ROOT ROUTE: Ensures the app responds to the base URL (Vercel normally handles this)
const path = require('path');

app.get('/', (req, res) => {
    // Send the index.html file from the root directory
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. SERVE STATIC FILES: Vercel will ignore this and serve files directly, but it's good for local testing.
app.use(express.static(path.join(__dirname))); 


// 🔐 SECURE PROXY ENDPOINT: /api/generateRecipe
app.post('/api/generateRecipe', async (req, res) => {
    try {
        const { prompt, image } = req.body;
        const parts = [];

        if (prompt) {
            parts.push({ text: prompt });
        }

        if (image && image.data) {
            parts.push({ 
                inlineData: { 
                    mimeType: image.mimeType, 
                    data: image.data 
                } 
            });
        }
        
        if (parts.length === 0) {
            return res.status(400).json({ error: { message: "No prompt or image data provided." } });
        }


        // Make the secure, server-side call to the Gemini API
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Using 2.5 Flash for speed
            contents: parts
        });

        res.json(response); 

    } catch (error) {
        console.error("Gemini API Error:", error.message);
        res.status(500).json({ error: { message: "Failed to generate content. Check server logs." } });
    }
});


// --- START: VERCEL DEPLOYMENT / LOCAL LISTENER ---
// Only listen to the port if not running on Vercel (i.e., local development)
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
       console.log(`Server running securely at http://localhost:${port}`);
       console.log(`Access the app via: http://localhost:${port}/index.html`);
    });
}


// ✅ CRITICAL FOR VERCEL: Export the application instance for serverless function use.
module.exports = app;

// --- END: VERCEL DEPLOYMENT / LOCAL LISTENER ---