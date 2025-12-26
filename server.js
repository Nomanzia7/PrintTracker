const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// MongoDB Connection
const mongoURI = "mongodb+srv://admin:Print123@cluster0.djwrc3o.mongodb.net/PrintTracker?retryWrites=true&w=majority";
mongoose.connect(mongoURI).then(() => console.log("✅ MongoDB Connected")).catch(err => console.log(err));

// Data Models
const User = mongoose.model('User', { crn: String, lastPrintDate: Date });
const Activity = mongoose.model('Activity', { crn: String, action: String, timestamp: { type: Date, default: Date.now } });
const History = mongoose.model('History', { crn: String, printDate: Date });

// 1. Check Eligibility
app.get('/check/:crn', async (req, res) => {
    try {
        const user = await User.findOne({ crn: req.params.crn });
        if (!user) return res.json({ found: false });
        
        const diffDays = Math.floor((new Date() - new Date(user.lastPrintDate)) / (1000 * 60 * 60 * 24));
        res.json({ found: true, user, eligible: diffDays >= 7 });
    } catch (error) { res.status(500).json({ error: error.message }); }
});

// 2. Update Date to Today
app.post('/update-date', async (req, res) => {
    const { crn } = req.body;
    const now = new Date();
    await User.findOneAndUpdate({ crn }, { lastPrintDate: now });
    await new History({ crn, printDate: now }).save();
    await new Activity({ crn, action: "Request submitted" }).save();
    res.json({ success: true });
});

// 3. Register New CRN (via Popup)
app.post('/add-new', async (req, res) => {
    const { crn, lastPrintDate } = req.body;
    const exists = await User.findOne({ crn });
    if (exists) return res.status(400).json({ success: false, message: "CRN already registered!" });

    await new User({ crn, lastPrintDate: new Date(lastPrintDate) }).save();
    await new History({ crn, printDate: new Date(lastPrintDate) }).save();
    await new Activity({ crn, action: "CRN registered" }).save();
    res.json({ success: true });
});

// 4. Get History for specific CRN
app.get('/history/:crn', async (req, res) => {
    const logs = await History.find({ crn: req.params.crn }).sort({ printDate: -1 });
    res.json(logs);
});

// 5. Get Recent Activities for Sidebar
app.get('/activities', async (req, res) => {
    const list = await Activity.find().sort({ timestamp: -1 }).limit(5);
    res.json(list);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
