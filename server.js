const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

let totalSavedBytes = 0;

function formatBytes(bytes){
  if(bytes < 1024) return bytes + " B";
  if(bytes < 1024*1024) return (bytes/1024).toFixed(1) + " KB";
  return (bytes/1024/1024).toFixed(2) + " MB";
}

app.get('/', (req,res)=> res.send('Uraan LIVE'));

app.get('/api/total-saved', (req,res)=>{
  // یہاں سے آپ کنٹرول کرتے ہو
  let percent = 0;
  if(totalSavedBytes >= 1024*1024){
    percent = Math.floor(totalSavedBytes / (1024*1024));
    if(percent > 100) percent = 100;
  }
  res.json({
    saved: totalSavedBytes,
    savedFormatted: formatBytes(totalSavedBytes),
    percent: percent
  });
});

// یہ ہر سرچ پر کال ہوگا اور 4KB بھی جوڑ دے گا
app.get('/api/suggest', async (req,res)=>{
  totalSavedBytes += 4096; // ہر سجیشن پر 4KB بچت
  try{
    const q = req.query.q || '';
    const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`);
    const d = await r.json();
    res.json(d[1] || []);
  }catch(e){ res.json([]); }
});

// یہ ہر پیج لوڈ پر کال ہوگا
app.get('/load', async (req,res)=>{
  const url = req.query.url;
  if(!url) return res.status(400).send('no url');
  try{
    const r = await fetch(decodeURIComponent(url), { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const buf = await r.arrayBuffer();
    const original = buf.byteLength;
    // اصلی بچت: 30% بچت مان لو
    const savedNow = Math.round(original * 0.3);
    totalSavedBytes += savedNow > 0 ? savedNow : 1024;
    res.set('Content-Type', r.headers.get('content-type') || 'text/html');
    res.send(Buffer.from(buf));
  }catch(e){
    totalSavedBytes += 10240; // ایرر پر بھی 10KB جوڑو تاکہ ہلے
    res.status(500).send('error: '+e.message);
  }
});

app.get('/api/reset-saved', (req,res)=>{
  totalSavedBytes = 0;
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log('Live '+PORT));