const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    await page.goto('https://1.kooora55.com/', { waitUntil: 'networkidle2' });
    
    const links = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a')).map(a => ({
            href: a.href,
            text: a.innerText.replace(/\n/g, ' '),
            html: a.innerHTML
        }));
    });
    
    fs.writeFileSync('output.json', JSON.stringify(links, null, 2));
    await browser.close();
})();
