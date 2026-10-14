const express = require('express');
const sharp = require('sharp');
const cors = require('cors');
const app = express();
app.use(cors());

app.get('/', (req, res) => {
  res.send('Uraan Server Chal Raha Hai');
});

app.get('/compress', async (req, res) => {
  try {
    const imageUrl = req.query.url;
    if (!imageUrl || !imageUrl.startsWith('http')) {
      return res.status(400).send('url galat hai');
    }
    const response = await fetch(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    const compressed = await sharp(buffer)
      .webp({ quality: 60 })
      .resize(1000, 1000, { fit: 'inside', withoutEnlargement: true })
      .toBuffer();
    res.set('Content-Type', 'image/webp');
    res.send(compressed);
  } catch (e) {
    res.status(500).send('error');
  }
});

app.listen(3000, () => console.log('Server 3000 par chal raha hai'));

app.get('/load', async (req, res) => {
  try {
    const pageUrl = req.query.url;
    if (!pageUrl || !pageUrl.startsWith('http')) {
      return res.status(400).send('url galat hai');
    }
    const response = await fetch(pageUrl);
    let html = await response.text();
   html = html.replace(/src=["'](https?:[^"']+)["']/g, (match, p1) => `src="/compress?url=${encodeURIComponent(p1)}"`);
    res.send(html);
  } catch (e) {
    res.status(500).send('Page load nahi hua');
  }
});
