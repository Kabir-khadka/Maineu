const mongoose = require('mongoose');

const dailyAnalyticsSchema = new mongoose.Schema({
    date: {
        type: Date,
        required: true,
        unique: true, //Only one entry per day
    },
    foodItems: [
        {
            name: {
                type: String,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
                default: 0,
            },
        },
    ],
}, { timestamps: true });

const DailyAnalytics = mongoose.model('DailyAnalytics', dailyAnalyticsSchema);

module.exports = DailyAnalytics;