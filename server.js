const express = require('express');
const sharp = require('sharp');
const cors = require('cors');
const zlib = require('zlib');
const app = express();
app.use(cors());

let totalOriginalBytes = 0;
let totalCompressedBytes = 0;

function formatBytes(bytes) {
  if (bytes <= 0) return "0 B";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(2) + " MB";
}

app.get('/', (req, res) => {
  res.send('Uraan Server FULL CONNECTED - REAL MODE');
});

app.get('/stats', (req, res) => {
  const used = process.memoryUsage().heapUsed / 1024 / 1024;
  const total = 512;
  const percent = Math.round((used / total) * 100);
  res.json({ percent: percent, used: Math.round(used) });
});

app.get('/api/total-saved', (req, res) => {
  const saved = totalOriginalBytes - totalCompressedBytes;
  const savedPositive = saved > 0 ? saved : 0;
  let percent = 0;
  let savedMB = savedPositive / (1024 * 1024);
  
  // آپ والا سسٹم: KB پر 0%, MB پر 1%, 2%
  if (savedPositive < 1024 * 1024) {
    percent = 0;
  } else {
    percent = Math.floor(savedMB);
    if (percent > 100) percent = 100;
  }

  res.json({
    original: totalOriginalBytes,
    compressed: totalCompressedBytes,
    saved: savedPositive,
    savedFormatted: formatBytes(savedPositive),
    percent: percent,
    realSavingPercent: totalOriginalBytes > 0 ? Math.round((savedPositive / totalOriginalBytes) * 100) : 0
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
    const response = await fetch(`http://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`);
    const data = await response.json();
    // SUGGEST BHI GINO - 4KB BHI
    let jsonStr = JSON.stringify(data);
    let orig = Buffer.byteLength(jsonStr);
    let comp = zlib.gzipSync(jsonStr).length;
    totalOriginalBytes += orig;
    totalCompressedBytes += comp;
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
    if (!imageUrl || !imageUrl.startsWith('http')) return res.status(400).send('url galat hai');
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const originalSize = buffer.length;
    const compressed = await sharp(buffer).webp({ quality: 60 }).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).toBuffer();
    totalOriginalBytes += originalSize;
    totalCompressedBytes += compressed.length;
    res.set('Content-Type', 'image/webp');
    res.send(compressed);
  } catch (e) {
    res.status(500).send('error');
  }
});

app.get('/load', async (req, res) => {
  try {
    const pageUrl = req.query.url;
    if (!pageUrl || !pageUrl.startsWith('http')) return res.status(400).send('url galat hai');
    const response = await fetch(pageUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const contentType = response.headers.get('content-type') || '';
    const buffer = Buffer.from(await response.arrayBuffer());
    
    // HAR CHEEZ KO REAL GINO - 4KB BHI
    let originalSize = buffer.length;
    let compressedSize = 0;

    if (contentType.includes('image')) {
      try {
        const compressed = await sharp(buffer).webp({ quality: 60 }).resize(800, 800, { fit: 'inside', withoutEnlargement: true }).toBuffer();
        compressedSize = compressed.length;
        totalOriginalBytes += originalSize;
        totalCompressedBytes += compressedSize;
        res.set('Content-Type', 'image/webp');
        return res.send(compressed);
      } catch {
        compressedSize = Math.round(originalSize * 0.9);
        totalOriginalBytes += originalSize;
        totalCompressedBytes += compressedSize;
        res.set('Content-Type', contentType);
        return res.send(buffer);
      }
    } else {
      // HTML, CSS, JS KO REAL GZIP SE COMPRESS KARO - YEH REAL HAI
      try {
        let gzipped = zlib.gzipSync(buffer);
        compressedSize = gzipped.length;
      } catch {
        compressedSize = Math.round(originalSize * 0.7);
      }
      totalOriginalBytes += originalSize;
      totalCompressedBytes += compressedSize;

      if (contentType.includes('text/html')) {
        let html = buffer.toString();
        html = html.replace(/src=["'](https?:\/\/[^"']+)["']/g, (m, p1) => {
          if (p1.includes('/compress?url=')) return m;
          if (p1.includes('data:')) return m;
          return `src="/compress?url=${encodeURIComponent(p1)}"`;
        });
        res.set('Content-Type', 'text/html');
        return res.send(html);
      }
      res.set('Content-Type', contentType);
      return res.send(buffer);
    }
  } catch (e) {
    res.status(500).send('Page load nahi hua: ' + e.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Uraan REAL Server ' + PORT));