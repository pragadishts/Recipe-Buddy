// server.js
// server.js (Around lines 10-18)

// ...


const express = require('express');
const { GoogleGenAI } = require('@google/genai');
// Load environment variables from .env file
require('dotenv').config(); 

const app = express();
const port = process.env.PORT || 3000;

// Initialize the GoogleGenAI client using the secure environment variable
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error("FATAL ERROR: GEMINI_API_KEY not found in .env file or environment.");
    // In a real application, you might want a gentler fallback, but this ensures security.
    process.exit(1); 
}
const ai = new GoogleGenAI(apiKey);


// Middleware to parse incoming JSON request bodies
app.use(express.json({ limit: '50mb' })); // Increased limit for image data
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// Serve all static files (like index.html, CSS, etc.) from the current directory
app.use(express.static(__dirname)); 


// 🔐 SECURE PROXY ENDPOINT: /api/generateRecipe
// This route securely calls the Gemini API for both text-only (voice) and multimodal (image) requests.
app.post('/api/generateRecipe', async (req, res) => {
    try {
        // Extract the data sent from the frontend
        const { prompt, image } = req.body;

        const parts = [];

        // 1. Add the text prompt
        if (prompt) {
            parts.push({ text: prompt });
        }

        // 2. Add the image data if it exists (for the main recipe generation)
        if (image && image.data) {
            parts.push({ 
                inlineData: { 
                    mimeType: image.mimeType, 
                    data: image.data 
                } 
            });
        }
        
        // Safety check
        if (parts.length === 0) {
            return res.status(400).json({ error: { message: "No prompt or image data provided." } });
        }


        // Make the secure, server-side call to the Gemini API
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash", // Using 2.5 Flash for speed
            contents: parts
        });

        // Send the result back to the client
        res.json(response); 

    } catch (error) {
        console.error("Gemini API Error:", error.message);
        res.status(500).json({ error: { message: "Failed to generate content. Check server logs." } });
    }
});

app.listen(port, () => {
    console.log(`Server running securely at http://localhost:${port}`);
    console.log(`Access the app via: http://localhost:${port}/index.html`);
});