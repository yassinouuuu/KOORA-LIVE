const fs = require('fs');
const path = require('path');

async function scrapeNews() {
    console.log('Starting beIN Sports News Scraper...');
    const headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.7,en;q=0.3',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
    };

    try {
        // 1. Fetch homepage to get the latest articles list
        const res = await fetch('https://www.beinsports.com/ar-mena/', { headers });
        const html = await res.text();
        
        // Find __NEXT_DATA__ JSON
        const match = html.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
        if (!match) {
            console.error('Could not find __NEXT_DATA__ in beIN Sports homepage');
            return;
        }
        
        const data = JSON.parse(match[1]);
        const queries = data.props?.pageProps?.initialState?.api?.queries || {};
        const homeKey = Object.keys(queries).find(k => k.includes('getHomePage'));
        if (!homeKey || !queries[homeKey]?.data) {
            console.error('Could not find homepage query data');
            return;
        }
        
        const homeData = queries[homeKey].data;
        
        // Recursively extract all articles from the homepage JSON
        const foundArticles = [];
        const seenIds = new Set();
        
        function search(obj) {
            if (!obj || typeof obj !== 'object') return;
            if (Array.isArray(obj)) {
                obj.forEach(search);
                return;
            }
            if (obj.title && obj._type === 'article' && obj._id && !seenIds.has(obj._id)) {
                seenIds.add(obj._id);
                
                // Parse slug
                let slug = '';
                if (typeof obj.url_slug === 'string') {
                    try {
                        const parsed = JSON.parse(obj.url_slug);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            slug = parsed[0];
                        }
                    } catch (e) {
                        slug = obj.url_slug;
                    }
                } else if (Array.isArray(obj.url_slug) && obj.url_slug.length > 0) {
                    slug = obj.url_slug[0];
                }
                
                // Parse Image URL
                let image = 'logo.png'; // default fallback
                if (obj.hero_image_manager?.hero_image_manager__element) {
                    try {
                        const imgData = JSON.parse(obj.hero_image_manager.hero_image_manager__element);
                        if (imgData && imgData[0]?.externalLink) {
                            image = imgData[0].externalLink;
                        }
                    } catch (e) {}
                } else if (obj.video_manager?.video_manager__video_manager) {
                    try {
                        const videoData = JSON.parse(obj.video_manager.video_manager__video_manager);
                        if (videoData && videoData[0]?.thumbnail) {
                            image = videoData[0].thumbnail;
                        }
                    } catch (e) {}
                }
                
                if (slug) {
                    foundArticles.push({
                        id: obj._id,
                        title: obj.title,
                        summary: obj.teaser || obj.subtitle || '',
                        slug: slug,
                        image: image,
                        date: obj.publication_date || new Date().toISOString()
                    });
                }
            }
            for (let k in obj) {
                search(obj[k]);
            }
        }
        search(homeData);
        
        console.log(`Found ${foundArticles.length} valid articles on homepage.`);
        
        // Select the top 10 latest articles to scrape full content
        const articlesToScrape = foundArticles.slice(0, 10);
        const finalArticles = [];
        
        // Find href links in homepage HTML to map slugs to actual URLs
        const hrefs = [];
        const regex = /href="([^"]+?)"/g;
        let hrefMatch;
        while (hrefMatch = regex.exec(html)) {
            hrefs.push(hrefMatch[1]);
        }
        
        for (const art of articlesToScrape) {
            // Find the actual URL for this article slug
            let relativeUrl = hrefs.find(h => h.startsWith('/ar-mena/') && (h.includes(encodeURIComponent(art.slug)) || h.includes(art.slug)));
            if (!relativeUrl) {
                console.log(`Could not find URL for slug: ${art.slug}, skipping.`);
                continue;
            }
            
            const articleUrl = `https://www.beinsports.com${relativeUrl}`;
            console.log(`Scraping content from: ${articleUrl}`);
            
            try {
                const artRes = await fetch(articleUrl, { headers });
                const artHtml = await artRes.text();
                
                const artMatch = artHtml.match(/<script id="__NEXT_DATA__" type="application\/json">(.+?)<\/script>/);
                if (!artMatch) {
                    console.log(`__NEXT_DATA__ not found on article page, skipping.`);
                    continue;
                }
                
                const artJson = JSON.parse(artMatch[1]);
                const artQueries = artJson.props?.pageProps?.initialState?.api?.queries || {};
                const layoutKey = Object.keys(artQueries).find(k => k.includes('getLayout'));
                
                if (!layoutKey || !artQueries[layoutKey]?.data) {
                    console.log(`Layout data not found on article page, skipping.`);
                    continue;
                }
                
                const layoutData = artQueries[layoutKey].data;
                
                // Find article details in layout
                let fullArticle = null;
                function searchArticleInLayout(obj) {
                    if (fullArticle) return;
                    if (!obj || typeof obj !== 'object') return;
                    if (Array.isArray(obj)) {
                        obj.forEach(searchArticleInLayout);
                        return;
                    }
                    if (obj.title && obj._type === 'article') {
                        fullArticle = obj;
                        return;
                    }
                    for (let k in obj) {
                        searchArticleInLayout(obj[k]);
                    }
                }
                searchArticleInLayout(layoutData);
                
                if (fullArticle && fullArticle.body?.text) {
                    let cleanedContent = fullArticle.body.text;
                    // Replace beIN Sports subscription links with the user's custom website link
                    cleanedContent = cleanedContent.replace(/href="https:\/\/www\.bein\.(online|pro)[^"]*"/gi, 'href="https://yallagoaltv.com/"');
                    cleanedContent = cleanedContent.replace(/href="http:\/\/www\.bein\.(online|pro)[^"]*"/gi, 'href="https://yallagoaltv.com/"');
                    
                    art.content = cleanedContent;
                    finalArticles.push(art);
                    console.log(`Successfully scraped "${art.title}"`);
                } else {
                    console.log(`Could not extract body text for "${art.title}"`);
                }
            } catch (e) {
                console.error(`Error scraping article ${art.title}:`, e.message);
            }
            
            // Brief delay to prevent hitting rate limits
            await new Promise(r => setTimeout(r, 500));
        }
        
        // Load existing articles from news.json if it exists
        const newsJsonPath = path.join(__dirname, 'news.json');
        let existingArticles = [];
        if (fs.existsSync(newsJsonPath)) {
            try {
                const fileData = fs.readFileSync(newsJsonPath, 'utf8');
                const parsed = JSON.parse(fileData);
                if (Array.isArray(parsed)) {
                    existingArticles = parsed;
                }
            } catch (err) {
                console.warn('Could not parse existing news.json, starting fresh:', err.message);
            }
        }

        // Combine new and old, removing duplicates by ID
        const allArticlesMap = new Map();
        
        // Add existing articles first
        existingArticles.forEach(art => {
            if (art && art.id) {
                allArticlesMap.set(art.id, art);
            }
        });
        
        // Overwrite or add newly scraped articles
        finalArticles.forEach(art => {
            if (art && art.id) {
                allArticlesMap.set(art.id, art);
            }
        });

        // Convert map back to array and sort by date descending (newest first)
        const mergedArticles = Array.from(allArticlesMap.values());
        mergedArticles.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Save the merged news back to news.json
        fs.writeFileSync(newsJsonPath, JSON.stringify(mergedArticles, null, 2));
        console.log(`Successfully merged and saved ${mergedArticles.length} total news articles (added ${finalArticles.length} new) to news.json ✅`);
        
        // Dynamically regenerate sitemap.xml
        generateSitemap(mergedArticles);
        
    } catch (e) {
        console.error('Fatal error during scraping:', e);
    }
}

function generateSitemap(articles) {
    const sitemapPath = path.join(__dirname, 'sitemap.xml');
    const latestDate = articles[0]?.date ? articles[0].date.split('T')[0] : '2026-05-23';
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Pages principales -->
  <url>
    <loc>https://yallagoaltv.com/</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>always</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://yallagoaltv.com/channels</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://yallagoaltv.com/news</loc>
    <lastmod>${latestDate}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
`;

    // Add article URLs
    articles.forEach(art => {
        const dateOnly = art.date ? art.date.split('T')[0] : '2026-05-23';
        xml += `  <url>
    <loc>https://yallagoaltv.com/article?id=${art.id}</loc>
    <lastmod>${dateOnly}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>\n`;
    });

    xml += `</urlset>\n`;
    fs.writeFileSync(sitemapPath, xml, 'utf8');
    console.log('Dynamic sitemap.xml generated successfully! ✅');
}

scrapeNews();
