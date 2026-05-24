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
mongoose.connect(mongoURI).then(() => console.log("✅ MongoDB Connected Successfully!")).catch(err => console.log(err));

// Data Models
const User = mongoose.model('User', { 
    crn: String, 
    lastPrintDate: Date 
});

const Activity = mongoose.model('Activity', { 
    crn: String, 
    action: String, 
    timestamp: { type: Date, default: Date.now } 
});

app.get('/check/:crn', async (req, res) => {
    try {
        const user = await User.findOne({ crn: req.params.crn });
        if (!user) return res.json({ found: false });
        
        // Normalize today's date to midnight local time
        const now = new Date();
        const todayDateOnly = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // Normalize the stored last print date to midnight local time
        const lastPrint = new Date(user.lastPrintDate);
        const lastPrintDateOnly = new Date(lastPrint.getFullYear(), lastPrint.getMonth(), lastPrint.getDate());

        // Calculate the difference in calendar days
        const msPerDay = 1000 * 60 * 60 * 24;
        const diffDays = Math.floor((todayDateOnly - lastPrintDateOnly) / msPerDay);

        // If 7 or more calendar days have passed, they are eligible
        res.json({ found: true, user, eligible: diffDays >= 6 });
    }
});

// 2. Update Date to Today with Activity Comment
app.post('/update-date', async (req, res) => {
    try {
        const { crn } = req.body;
        const now = new Date();

        // تاریخ اپ ڈیٹ کریں
        await User.findOneAndUpdate({ crn }, { lastPrintDate: now });

        // ایکٹیویٹی لاگ میں "Date updated" کمنٹ کے ساتھ محفوظ کریں
        await new Activity({ 
            crn: crn, 
            action: "Date updated" 
        }).save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: "Update failed" });
    }
});

// 3. Register New CRN (via Popup)
app.post('/add-new', async (req, res) => {
    try {
        const { crn, lastPrintDate } = req.body;
        const exists = await User.findOne({ crn });
        
        if (exists) return res.status(400).json({ success: false, message: "CRN already registered!" });

        await new User({ crn, lastPrintDate: new Date(lastPrintDate) }).save();
        
        // رجسٹریشن کی ایکٹیویٹی محفوظ کریں
        await new Activity({ 
            crn: crn, 
            action: "CRN registered" 
        }).save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 4. Get Recent Activities (Last 4 records within 12-hour timeframe)
app.get('/activities', async (req, res) => {
    try {

        const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000);

        const list = await Activity.find({
            timestamp: { $gte: twelveHoursAgo }
        })
        .sort({ timestamp: -1 }) // تازہ ترین ریکارڈز سب سے اوپر
        .limit(4); // صرف آخری 4 ریکارڈز
        
        res.json(list);
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch activities" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
