const express = require('express');
const sharp = require('sharp');
const cors = require('cors');
const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('Uraan Server Chal Raha Hai');
});

// --- 1. RING KE LIYE API (RAM ka rang) ---
app.get('/stats', (req, res) => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  const total = 512;
  const percent = Math.round((used / total) * 100);
  res.json({ percent: percent, used: Math.round(used) });
});

// --- 2. ENGINE KE LIYE NAYA API (Suggest - s likho to list aaye) ---
app.get('/api/suggest', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);
    
    // Google se suggest lega ye server
    const response = await fetch(`http://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'Uraan-Browser/1.0' }
    });
    const data = await response.json();
    // data[1] me list hoti hai
    res.json(data[1] || []);
  } catch (e) {
    res.json([]);
  }
});

// --- 3. Search ko bhi server se guzarna (Engine system) ---
app.get('/api/search', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.status(400).send('query chahiye');
    // Isko aap frontend me use kar sakte ho, direct Google par nahi jayega
    const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
    res.redirect(`/load?url=${encodeURIComponent(googleUrl)}`);
  } catch (e) {
    res.status(500).send('search error');
  }
});

app.get('/compress', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return res.status(400).send('url galat hai');
    }
    const response = await fetch(imageUrl, {
        headers: { 'User-Agent': 'Uraan-Browser/1.0' }
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const compressed = await sharp(buffer)
      .webp({ quality: 60 })
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(compressed);
  } catch (e) {
    res.status(500).send('error');
  }
});

app.get('/load', async (req, res) => {
  try {
    const pageUrl = req.query.url;
    if (!pageUrl || !pageUrl.startsWith('http')) {
      return res.status(400).send('url galat hai');
    }
    const response = await fetch(pageUrl, {
        headers: { 'User-Agent': 'Uraan-Browser/1.0' }
    });
    let html = await response.text();
    html = html.replace(/src=["'](https?:[^"']+)["']/g, (match, p1) => `src="/compress?url=${encodeURIComponent(p1)}"`);
    res.send(html);
  } catch (e) {
    res.status(500).send('Page load nahi hua');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server '+PORT+' par chal raha hai'));