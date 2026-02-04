const puppeteer = require('puppeteer');
const Event = require('../models/Event');

const scrapeEventFinda = async () => {
    console.log("EventFinda Scraper Started (Single-day events only)...");
    const SOURCE_NAME = 'EventFinda';
    let browser = null;
    let newCount = 0;
    let updatedCount = 0;
    const scrapedSourceUrls = [];

    const MAX_PAGES = 5;

    try {
        browser = await puppeteer.launch({
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });

        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0');

        for (let pageNum = 1; pageNum <= MAX_PAGES; pageNum++) {
            const url = pageNum === 1
                ? 'https://www.eventfinda.com.au/whatson/events/sydney'
                : `https://www.eventfinda.com.au/whatson/events/sydney/page/${pageNum}`;

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
            await page.evaluate(() => window.scrollBy(0, 1000));
            await new Promise(r => setTimeout(r, 1500));

            const pageEvents = await page.evaluate(() => {
                const items = [];
                const cards = document.querySelectorAll('.listing-item, .card, .event-card');

                cards.forEach(card => {
                    const titleEl = card.querySelector('.title a, h2 a, h3 a');
                    if (!titleEl) return;

                    // SKIP MULTI-DAY EVENTS
                    const dateEl = card.querySelector('.dates, .time, .event-date');
                    const dateText = dateEl ? dateEl.innerText.toLowerCase() : '';
                    if (
                        dateText.includes('–') ||
                        dateText.includes('-') ||
                        dateText.includes('to') ||
                        dateText.includes('multiple')
                    ) return;

                    const title = titleEl.innerText.trim();
                    const link = titleEl.href;

                    let imageUrl = '';
                    const imgEl = card.querySelector('img');
                    if (imgEl) imageUrl = imgEl.getAttribute('data-src') || imgEl.src;

                    const venueEl = card.querySelector('.location, .venue');
                    const venue = venueEl ? venueEl.innerText.trim() : 'Sydney, NSW';

                    items.push({ title, sourceUrl: link, imageUrl, venue });
                });

                return items;
            });

            for (const ev of pageEvents) {
                if (scrapedSourceUrls.includes(ev.sourceUrl)) continue;
                scrapedSourceUrls.push(ev.sourceUrl);

                const eventData = {
                    title: ev.title,
                    description: `Event at ${ev.venue}. Details on EventFinda.`,
                    startDate: new Date(),
                    endDate: new Date(),
                    venue: ev.venue,
                    city: 'Sydney',
                    imageUrl: ev.imageUrl,
                    sourceUrl: ev.sourceUrl,
                    source: SOURCE_NAME,
                    lastScrapedAt: new Date()
                };

                const existingEvent = await Event.findOne({ sourceUrl: ev.sourceUrl });

                if (!existingEvent) {
                    await Event.create({ ...eventData, status: 'new' });
                    newCount++;
                } else {
                    await Event.updateOne({ _id: existingEvent._id }, {
                        ...eventData,
                        status: existingEvent.status === 'imported' ? 'imported' : 'updated'
                    });
                    updatedCount++;
                }
            }
        }

        console.log(`EventFinda Done: ${newCount} new | ${updatedCount} updated`);

    } catch (err) {
        console.error('EventFinda Error:', err.message);
    } finally {
        if (browser) await browser.close();
    }
};

module.exports = scrapeEventFinda;