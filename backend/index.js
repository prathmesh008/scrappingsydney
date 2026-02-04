require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cron = require('node-cron');
const scrapeEvents = require('./scraper/scraper');
const scrapeEventFinda = require('./scraper/eventfinda');
const Event = require('./models/Event');
const Lead = require('./models/Lead');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sydney-events')
    .then(() => console.log('MongoDB Connected'))
    .catch(err => console.error('MongoDB Error:', err));

cron.schedule('0 * * * *', async () => {
    console.log('Hourly Auto-Scraper Started...');
    try {
        await Promise.allSettled([
            scrapeEvents(),
            scrapeEventFinda()
        ]);

        const now = new Date();
        const result = await Event.updateMany(
            {
                status: { $ne: 'inactive' },
                $and: [
                    { startDate: { $lt: now } },

                    {
                        $or: [
                            { endDate: { $exists: false } },
                            { endDate: null },
                            { endDate: { $lt: now } }
                        ]
                    },

                    {
                        $or: [
                            { nextOccurrence: { $exists: false } },
                            { nextOccurrence: null },
                            { nextOccurrence: { $lt: now } }
                        ]
                    }
                ]
            },
            {
                $set: { status: 'inactive' }
            }
        );

        console.log(`Maintenance: Marked ${result.modifiedCount} old events as inactive.`);
        console.log('Auto-Scraper Finished.');

    } catch (err) {
        console.error('Auto-Scraper Failed:', err);
    }
});



app.get('/api/events', async (req, res) => {
    try {
        const events = await Event.find().sort({ startDate: 1 }).lean();
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/leads', async (req, res) => {
    try {
        const { email, consent, eventId } = req.body;
        const newLead = await Lead.create({ email, consent, eventId });
        console.log(`Lead Captured: ${email}`);
        res.status(201).json(newLead);
    } catch (err) {
        res.status(400).json({ error: "Failed to save lead." });
    }
});

app.patch('/api/events/:id/import', async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(req.params.id, {
            status: 'imported',
            importedAt: new Date(),
            importedBy: req.body.importedBy || 'admin'
        }, { new: true });
        res.json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/scrape', async (req, res) => {
    try {
        console.log("Manual Scrape Triggered...");
        await Promise.allSettled([scrapeEvents(), scrapeEventFinda()]);
        console.log("Manual Scrape Finished.");

        res.json({ message: 'Scraping finished.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));