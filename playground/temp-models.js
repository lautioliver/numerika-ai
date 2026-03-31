import 'dotenv/config';
const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + process.env.GEMINI_API_KEY);
const data = await response.json();
const names = data.models.map(m => m.name);
import fs from 'fs';
fs.writeFileSync('temp-models.txt', JSON.stringify(names, null, 2));
