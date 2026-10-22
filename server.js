const express = require('express');
const sharp = require('sharp');
const cors = require('cors');
const app = express();
app.use(cors());

let totalOriginalBytes = 0;
let totalCompressedBytes = 0;

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/1024/1024).toFixed(2) + " MB";
}

app.get('/', (req, res) => {
  res.send('Uraan Server Chal Raha Hai - REAL MODE');
});

app.get('/stats', (req, res) => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  const total = 512;
  const percent = Math.round((used / total) * 100);
  res.json({ percent: percent, used: Math.round(used) });
});

app.get('/api/total-saved', (req, res) => {
  const saved = totalOriginalBytes - totalCompressedBytes;
  const percent = totalOriginalBytes > 0 ? Math.round((saved / totalOriginalBytes) * 100) : 0;
  res.json({
    original: totalOriginalBytes,
    compressed: totalCompressedBytes,
    saved: saved,
    savedFormatted: formatBytes(saved > 0 ? saved : 0),
    percent: percent
  });
});

app.get('/api/reset-saved', (req, res) => {
  totalOriginalBytes = 0;
  totalCompressedBytes = 0;
  res.json({ message: "Reset ho gaya" });
});

app.get('/api/suggest', async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);
    const response = await fetch(`http://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`, {
        headers: { 'User-Agent': 'Uraan-Browser/1.0' }
    });
    const data = await response.json();
    res.json(data[1] || []);
  } catch (e) {
    res.json([]);
  }
});

app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q) return res.status(400).send('query chahiye');
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  res.redirect(`/load?url=${encodeURIComponent(googleUrl)}`);
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
    const originalSize = buffer.length;

    const compressed = await sharp(buffer)
      .webp({ quality: 60 })
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    const compressedSize = compressed.length;

    totalOriginalBytes += originalSize;
    totalCompressedBytes += compressedSize;

    console.log(`Original: ${originalSize} -> Compressed: ${compressedSize} | Saved: ${originalSize - compressedSize}`);

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
        headers: { 'User-Agent': 'Mozilla/5.0 Uraan-Browser/1.0' }
    });
    let html = await response.text();
    html = html.replace(/src=["'](https?:[^"']+)["']/g, (match, p1) => {
      if(p1.includes('/compress?url=')) return match;
      if(p1.includes('data:')) return match;
      return `src="/compress?url=${encodeURIComponent(p1)}"`;
    });
    res.send(html);
  } catch (e) {
    res.status(500).send('Page load nahi hua');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Uraan REAL Server '+PORT+' par chal raha hai'));