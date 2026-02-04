const axios = require('axios');
const Event = require('../models/Event');

// CREDENTIALS
const APP_ID = 'LCD3FE43H0';
const API_KEY = '421635fd8560db74dfbe24b597a47dca';
const INDEX_NAME = 'mastertwo_whatson-content';

const scrapeEvents = async () => {
    console.log('Starting "WhatsOn" API Scraper...');
    const SOURCE_NAME = 'WhatsOn API';
    const url = `https://${APP_ID}-dsn.algolia.net/1/indexes/*/queries`;

    const MAX_PAGES = 5;
    let page = 0;
    let hasMore = true;

    const scrapedSourceUrls = [];
    let newCount = 0;
    let updatedCount = 0;

    try {
        while (hasMore && page < MAX_PAGES) {
            console.log(`Fetching page ${page + 1}/${MAX_PAGES}`);

            const response = await axios.post(
                url,
                {
                    requests: [{
                        indexName: INDEX_NAME,
                        params: new URLSearchParams({
                            query: '',
                            hitsPerPage: 100,
                            page: page,
                            filters: 'type:Event'
                        }).toString()
                    }]
                },
                {
                    headers: {
                        'X-Algolia-Application-Id': APP_ID,
                        'X-Algolia-API-Key': API_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const result = response.data.results[0];
            const hits = result.hits;

            if (!hits || hits.length === 0) {
                hasMore = false;
                break;
            }

            console.log(`Page ${page + 1}: ${hits.length} events`);

            for (const hit of hits) {
                // START DATE LOGIC
                // Start date represents the ORIGINAL start of the series/event
                let startDate;

                // 1. Prefer explicit start_date from API
                if (hit.start_date) {
                    startDate = new Date(hit.start_date);
                }
                // 2. Fallback to earliest date in dates array
                else if (Array.isArray(hit.dates) && hit.dates.length > 0) {
                    const sortedDates = [...hit.dates].sort();
                    startDate = new Date(sortedDates[0]);
                }
                // 3. Last resort: upcomingDate
                else if (hit.upcomingDate) {
                    startDate = new Date(hit.upcomingDate);
                }
                // 4. Absolute fallback
                else {
                    startDate = new Date();
                }

                // END DATE LOGIC
                // End date represents when the ENTIRE series finishes
                let endDate = startDate;

                // 1. Prefer explicit end_date or last_date
                if (hit.end_date) {
                    endDate = new Date(hit.end_date);
                } else if (hit.last_date) {
                    endDate = new Date(hit.last_date);
                }
                // 2. Fallback to last date in array
                else if (Array.isArray(hit.dates) && hit.dates.length > 0) {
                    const sortedDates = [...hit.dates].sort();
                    endDate = new Date(sortedDates[sortedDates.length - 1]);
                }
                // 3. Fallback to upcomingDate (if single day event)
                else if (hit.upcomingDate) {
                    endDate = new Date(hit.upcomingDate);
                }

                // Safety: End date cannot be before Start date
                if (endDate < startDate) endDate = startDate;

                // SKIP PAST EVENTS
                // If the event series completely ended before today, skip it.
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (endDate < today) {
                    continue;
                }

                // IMAGE LOGIC
                let imageUrl = '';
                if (hit.heroImage?.url) imageUrl = hit.heroImage.url;
                else if (hit.tileImageCloudinary?.[0]?.url) imageUrl = hit.tileImageCloudinary[0].url; // Usually best quality
                else if (hit.tileImageCloudinary?.[0]?.secure_url) imageUrl = hit.tileImageCloudinary[0].secure_url;
                else if (hit.image?.url) imageUrl = hit.image.url;
                else imageUrl = "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800";

                // TAGS LOGIC
                let tags = [];
                if (hit.categories && Array.isArray(hit.categories)) tags = [...tags, ...hit.categories];
                if (hit.tags && Array.isArray(hit.tags)) tags = [...tags, ...hit.tags];

                const eventData = {
                    title: hit.name || hit.title,

                    startDate,
                    endDate,
                    nextOccurrence: hit.upcomingDate ? new Date(hit.upcomingDate) : startDate, // REQUIRED FIELD

                    venue: hit.locationName || hit.venueName || 'Sydney',
                    address: hit.suburbName ? `${hit.suburbName}, NSW` : 'Sydney, NSW',
                    city: 'Sydney',

                    description: hit.strapline || hit.excerpt || hit.description || 'View details on website.',
                    tags: tags,
                    imageUrl,

                    sourceUrl: `https://whatson.cityofsydney.nsw.gov.au/events/${hit.slug}`,
                    source: SOURCE_NAME,
                    lastScrapedAt: new Date()
                };

                scrapedSourceUrls.push(eventData.sourceUrl);

                // UPSERT (Update or Insert)
                const existingEvent = await Event.findOne({ sourceUrl: eventData.sourceUrl });

                if (!existingEvent) {
                    await Event.create({ ...eventData, status: 'new' });
                    newCount++;
                } else {
                    // Don't overwrite status if it's 'imported'
                    let newStatus = 'updated';
                    if (existingEvent.status === 'imported') newStatus = 'imported';

                    await Event.updateOne(
                        { _id: existingEvent._id },
                        {
                            ...eventData,
                            status: newStatus,
                            lastScrapedAt: new Date()
                        }
                    );
                    updatedCount++;
                }
            }

            page++;
            if (page >= result.nbPages) hasMore = false;
            await new Promise(res => setTimeout(res, 200)); // Be nice to the API
        }

        // CLEANUP LOGIC
        // Mark events as inactive if they are past their final date OR not found in this scrape
        await Event.updateMany(
            {
                source: SOURCE_NAME,
                status: { $ne: 'inactive' },
                $or: [
                    // Case 1: Not found in current scrape
                    { sourceUrl: { $nin: scrapedSourceUrls } },
                    // Case 2: Event ended in the past
                    { endDate: { $lt: new Date() } }
                ]
            },
            {
                $set: { status: 'inactive', updatedAt: new Date() }
            }
        );

        console.log(`Sync Complete: ${newCount} New, ${updatedCount} Updated.`);
    } catch (error) {
        console.error('Scraper Failed:', error.message);
        if (error.response) {
            console.error('   Server Details:', error.response.data);
        }
    }
};

module.exports = scrapeEvents;