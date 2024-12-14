import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import cors from 'cors'; // Import cors
import { fileURLToPath } from 'url'; // Import fileURLToPath
import { generateSignedUrl } from './embed-api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all routes
app.use(cors());

// Convert import.meta.url to a file path and then get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/URL', async (req, res) => {
    console.log(req.body);
    try {
        if (!process.env.SECRET) {
            throw new Error('SECRET environment variable is not set');
        }
        const signedEmbedUrl = await generateSignedUrl();
        res.json({ iframeSrc: signedEmbedUrl });
    } catch (error) {
        console.error("Error in /URL endpoint:", error.message);
        res.status(500).json({ error: 'Failed to generate signed URL' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
