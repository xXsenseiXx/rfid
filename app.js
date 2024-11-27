const express = require('express');
const { connectToDb, getDb } = require('./db');

const app = express();
app.use(express.json());

let db;

// Connect to MongoDB
connectToDb((err) => {
    if (!err) {
        db = getDb();
        const PORT = 3000;
        const HOST = '0.0.0.0';
        app.listen(PORT, HOST, () => {
            console.log(`Server running on http://${HOST}:${PORT}`);
        });
    } else {
        console.error('Failed to connect to the database:', err);
    }
});

// Routes

// Fetch all cards
app.get('/cards', (req, res) => {
    let cards = [];
    db.collection('cards')
        .find()
        .toArray()
        .then((result) => {
            res.status(200).json(result);
        })
        .catch((err) => {
            console.error('Error fetching documents:', err);
            res.status(500).json({ error: 'Could not fetch the documents' });
        });
});

// Process payment
app.post('/api/process_payment', async (req, res) => {
    const { card_uid, amount } = req.body;

    if (!card_uid || !amount) {
        return res.status(400).json({ success: false, message: 'Missing card_uid or amount' });
    }

    try {
        const card = await db.collection('cards').findOne({ card_uid });
        if (!card) {
            return res.status(404).json({ success: false, message: "Card not found" });
        }

        if (card.balance >= amount) {
            await db.collection('cards').updateOne(
                { card_uid },
                { $inc: { balance: -amount } }
            );

            res.json({
                success: true,
                message: "Payment processed successfully",
                new_balance: card.balance - amount
            });
        } else {
            res.status(400).json({ success: false, message: "Insufficient balance" });
        }
    } catch (error) {
        console.error('Error processing payment:', error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

// Add a new card
app.post('/cards', (req, res) => {
    const card = req.body;

    db.collection('cards')
        .insertOne(card)
        .then((result) => {
            res.status(201).json(result);
        })
        .catch((err) => {
            console.error('Error inserting document:', err);
            res.status(500).json({ err: 'Could not create a new document' });
        });
});