const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// --- Middleware ---
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); 

// --- MongoDB Connection ---
const mongoURI = "mongodb+srv://admin:Print123@cluster0.djwrc3o.mongodb.net/PrintTracker?retryWrites=true&w=majority";

mongoose.connect(mongoURI).then(() => {
    console.log("✅ MongoDB Connected Successfully!");
}).catch(err => console.log("❌ DB Error:", err));

// --- Data Schema (Only CRN and Date) ---
const User = mongoose.model('User', { 
    crn: String, 
    lastPrintDate: Date 
});

// --- Routes ---

// 1. Home Page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 2. Add New Entry (No Name Field)
app.post('/add-new', async (req, res) => {
    try {
        const { crn, lastPrintDate } = req.body;
        
        let existingUser = await User.findOne({ crn: crn });
        if (existingUser) {
            return res.status(400).json({ success: false, message: "ID already exists!" });
        }

        const newUser = new User({ 
            crn, 
            lastPrintDate: new Date(lastPrintDate) 
        });
        
        await newUser.save();
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// 3. Search and Check Eligibility
app.get('/check/:crn', async (req, res) => {
    try {
        const user = await User.findOne({ crn: req.params.crn });
        if (!user) return res.json({ found: false });
        
        const lastDate = new Date(user.lastPrintDate);
        const today = new Date();
        const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
        
        res.json({ 
            found: true, 
            user, 
            eligible: diffDays >= 7, 
            daysPassed: diffDays 
        });
    } catch (error) {
        res.status(500).json({ found: false });
    }
});

// 4. Update to Current Date
app.post('/update-date', async (req, res) => {
    try {
        await User.findOneAndUpdate({ crn: req.body.crn }, { lastPrintDate: new Date() });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));