import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url'; // Import fileURLToPath
import { generateSignedUrl } from './embed-api.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Convert import.meta.url to a file path and then get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.get('/', async (req, res) => {
    const signedEmbedUrl = await generateSignedUrl();
    res.send(signedEmbedUrl);
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});