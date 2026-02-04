const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
    email: { type: String, required: true },
    consent: { type: Boolean, required: true, default: false },
    eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' }, 
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Lead', LeadSchema);