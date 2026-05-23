const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  const { id } = req.query;

  // Read article.html template
  const htmlPath = path.join(process.cwd(), 'article.html');
  let html = fs.readFileSync(htmlPath, 'utf8');

  // Default values
  let ogTitle = 'أخبار رياضية | يلا غول Yalla Goal';
  let ogDesc = 'تفاصيل الخبر الرياضي الحصري وتغطية شاملة لكل كواليس الرياضة العالمية والعربية على يلا غول Yalla Goal.';
  let ogImage = 'https://yallagoaltv.com/logo.png';
  let ogUrl = `https://yallagoaltv.com/article?id=${id || ''}`;
  let pageTitle = 'أخبار رياضية | يلا غول Yalla Goal';

  if (id) {
    try {
      const newsPath = path.join(process.cwd(), 'news.json');
      const newsData = JSON.parse(fs.readFileSync(newsPath, 'utf8'));
      const article = newsData.find(a => a.id === id);

      if (article) {
        ogTitle = article.title || ogTitle;
        ogDesc = article.summary || ogDesc;
        ogImage = article.image || ogImage;
        ogUrl = `https://yallagoaltv.com/article?id=${id}`;
        pageTitle = `${article.title} | يلا غول Yalla Goal`;
      }
    } catch (e) {
      console.error('Error reading news.json:', e);
    }
  }

  // Escape HTML special chars for attribute injection
  const esc = (str) => String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Inject all OG + Twitter Card meta tags into <head>
  const ogTags = `
    <!-- === DYNAMIC OG TAGS (Server-Side) === -->
    <meta property="og:type" content="article">
    <meta property="og:site_name" content="يلا غول Yalla Goal">
    <meta property="og:locale" content="ar_AR">
    <meta property="og:title" content="${esc(ogTitle)}">
    <meta property="og:description" content="${esc(ogDesc)}">
    <meta property="og:image" content="${esc(ogImage)}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="${esc(ogUrl)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${esc(ogTitle)}">
    <meta name="twitter:description" content="${esc(ogDesc)}">
    <meta name="twitter:image" content="${esc(ogImage)}">
    <link rel="canonical" href="${esc(ogUrl)}">
    <!-- === END DYNAMIC OG TAGS === -->`;

  // Replace the static placeholder OG block in article.html
  html = html.replace(
    /<!--\s*Open Graph tags dynamic\s*-->[\s\S]*?<meta property="og:image"[^>]*>/,
    ogTags
  );

  // Also update the <title> tag
  html = html.replace(
    /<title[^>]*>.*?<\/title>/,
    `<title>${esc(pageTitle)}</title>`
  );

  // Also update the meta description
  html = html.replace(
    /(<meta name="description"[^>]*content=")[^"]*(")/,
    `$1${esc(ogDesc)}$2`
  );

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(200).send(html);
};
