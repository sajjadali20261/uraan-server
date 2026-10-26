// server.js - FINAL - Uraan Proxy + Nichod System - No Storage on Server
const express = require('express');
const cors = require('cors');
const zlib = require('zlib');
const app = express();

app.use(cors({
  origin: '*',
  exposedHeaders: ['X-Saved-Bytes', 'X-Original-Bytes', 'X-Compressed-Bytes']
}));

app.use(express.json());

function minifyHTML(html){
  // اصلی نچوڑ - کمنٹ، فالتو سپیس ختم
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}

app.get('/', (req,res)=> res.send('Uraan Proxy LIVE - No Storage'));

// 1. SEARCH PROXY - Har search yahan se guzrega
app.get('/api/search', async (req,res)=>{
  const q = req.query.q || '';
  if(!q) return res.json([]);

  try{
    // Google Suggest ya CSE se lao
    const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`);
    const data = await r.json();
    const originalSize = Buffer.byteLength(JSON.stringify(data), 'utf8');
    
    // Nichodo
    const minified = JSON.stringify(data);
    const compressed = zlib.gzipSync(minified);
    const saved = originalSize - compressed.length;

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'X-Saved-Bytes');
    res.setHeader('X-Saved-Bytes', saved > 0 ? saved.toString() : '0');
    
    res.json(data[1] || []);
  }catch(e){
    res.setHeader('X-Saved-Bytes', '0');
    res.json([]);
  }
});

// 2. MAIN PROXY - Har website, image, video yahan se guzrega
app.get('/load', async (req,res)=>{
  const targetUrl = req.query.url || req.query.q;
  if(!targetUrl) return res.status(400).send('no url');

  let finalUrl = targetUrl;
  // Agar sirf q aaya to Google search banao
  if(!targetUrl.startsWith('http')){
    finalUrl = `https://www.google.com/search?q=${encodeURIComponent(targetUrl)}`;
  } else {
    try{ finalUrl = decodeURIComponent(targetUrl); }catch{}
  }

  try{
    const r = await fetch(finalUrl, { headers: { 'User-Agent': 'Mozilla/5.0 (Uraan Browser)' }});
    const buf = Buffer.from(await r.arrayBuffer());
    const originalSize = buf.length;

    let optimized = buf;
    let contentType = r.headers.get('content-type') || '';

    // HTML hai to minify karo - asli nichod
    if(contentType.includes('text/html') || contentType.includes('text/')){
      let text = buf.toString('utf8');
      text = minifyHTML(text);
      optimized = Buffer.from(text, 'utf8');
    }

    // Gzip se compress - asli bachat
    const gzipped = zlib.gzipSync(optimized);
    const savedBytes = originalSize - gzipped.length;

    // IMPORTANT: Server par save nahi karna, sirf header me bhejna hai
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'X-Saved-Bytes, X-Original-Bytes, X-Compressed-Bytes');
    res.setHeader('X-Original-Bytes', originalSize.toString());
    res.setHeader('X-Compressed-Bytes', gzipped.length.toString());
    res.setHeader('X-Saved-Bytes', savedBytes > 0 ? savedBytes.toString() : '0');
    res.setHeader('Content-Type', contentType);
    
    // Browser ko optimized bhejo
    res.send(optimized);

  }catch(e){
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Expose-Headers', 'X-Saved-Bytes');
    res.setHeader('X-Saved-Bytes', '0');
    res.status(500).send('Proxy Error: ' + e.message);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Uraan Proxy Live on '+PORT+' - No Server Storage'));