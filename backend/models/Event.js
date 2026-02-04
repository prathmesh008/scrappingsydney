const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    title: { type: String, required: true },

    startDate: { type: Date, required: true, index: true },
    endDate: { type: Date },

    // ADD THIS (CRITICAL)
    nextOccurrence: { type: Date, index: true },

    venue: { type: String },
    address: { type: String },
    city: { type: String, default: 'Sydney' },

    description: { type: String },
    tags: [String],
    imageUrl: { type: String },

    source: { type: String, required: true },
    sourceUrl: { type: String, required: true, unique: true },

    status: {
        type: String,
        enum: ['new', 'updated', 'inactive', 'imported'],
        default: 'new',
        index: true
    },

    lastScrapedAt: { type: Date, default: Date.now },
    importedAt: { type: Date },
    importedBy: { type: String },
    importNotes: { type: String }
}, {
    timestamps: true
});

module.exports = mongoose.model('Event', EventSchema);