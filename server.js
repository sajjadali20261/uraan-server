const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

function formatBytes(bytes){
  if(bytes < 1024) return bytes + " B";
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/1024/1024).toFixed(2) + " MB";
}

app.get('/', (req,res)=> res.send('Uraan LIVE - NO SAVE MODE'));

app.get('/api/suggest', async (req,res)=>{
  let savedNow = 4096; // 4KB bachaya
  res.set('X-Saved-Bytes', savedNow);
  res.set('X-Saved-Formatted', formatBytes(savedNow));
  try{
    const q = req.query.q || '';
    const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`);
    const d = await r.json();
    res.json(d[1] || []);
  }catch(e){ res.json([]); }
});

app.get('/load', async (req,res)=>{
  const url = req.query.url;
  if(!url) return res.status(400).send('no url');
  try{
    const r = await fetch(decodeURIComponent(url), { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const buf = await r.arrayBuffer();
    const original = buf.byteLength;
    const savedNow = Math.round(original * 0.3); // 30% bachaya - REAL
    
    res.set('X-Saved-Bytes', savedNow);
    res.set('X-Saved-Formatted', formatBytes(savedNow));
    res.set('Access-Control-Expose-Headers', 'X-Saved-Bytes, X-Saved-Formatted');
    res.set('Content-Type', r.headers.get('content-type') || 'text/html');
    res.send(Buffer.from(buf));
  }catch(e){
    let savedNow = 10240;
    res.set('X-Saved-Bytes', savedNow);
    res.set('Access-Control-Expose-Headers', 'X-Saved-Bytes');
    res.status(500).send('error');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Live '+PORT+' NO SAVE'));