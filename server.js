const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// --- ضروری سیٹنگز ---
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname)); // اسی فولڈر سے فائلیں چلانے کے لیے

// --- ڈیٹا بیس کنکشن (اپنا پاس ورڈ یہاں ڈالیں) ---
const mongoURI = "mongodb+srv://admin:Print123@cluster0.djwrc3o.mongodb.net/PrintTracker?retryWrites=true&w=majority";

mongoose.connect(mongoURI).then(() => {
    console.log("✅ MongoDB Connected Successfully!");
}).catch(err => console.log("❌ DB Error:", err));

const User = mongoose.model('User', { 
    crn: String, 
    name: String, 
    lastPrintDate: Date 
});

// --- ایپلیکیشن کے راستے (Routes) ---

// ہوم پیج دکھانے کے لیے
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// نیا ریکارڈ سیو کرنے کے لیے (یہ 404 ایرر فکس کرے گا)
app.post('/add-new', async (req, res) => {
    try {
        const { crn, name, lastPrintDate } = req.body;
        const newUser = new User({ crn, name, lastPrintDate: new Date(lastPrintDate) });
        await newUser.save();
        console.log(`✅ Saved: ${name}`);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// سرچ کرنے کے لیے
app.get('/check/:crn', async (req, res) => {
    try {
        const user = await User.findOne({ crn: req.params.crn });
        if (!user) return res.json({ found: false });
        
        const lastDate = new Date(user.lastPrintDate);
        const diffDays = Math.floor((new Date() - lastDate) / (1000 * 60 * 60 * 24));
        
        res.json({ found: true, user, eligible: diffDays >= 7 });
    } catch (error) {
        res.status(500).json({ found: false });
    }
});

// اپ ڈیٹ بٹن کے لیے
app.post('/update-date', async (req, res) => {
    try {
        await User.findOneAndUpdate({ crn: req.body.crn }, { lastPrintDate: new Date() });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false });
    }
});

app.listen(3000, () => console.log("🚀 Server running at: http://localhost:3000"));