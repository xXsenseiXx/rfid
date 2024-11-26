const express = require('express');
const app = express();
const { connectToDb, getDb } = require('./db');

// Middleware to parse JSON bodies
app.use(express.json());

let db;
connectToDb((err) => {
    if (!err) {
        app.listen(3000, '0.0.0.0', () => {
            console.log('Server running on http://192.168.1.40:3000');
        });
        db = getDb();
    }
});

app.get('/cards', (req, res) => {
    let cards = [];

    db.collection('cards')
        .find() // Get all documents from the collection
        .forEach((card) => {
            cards.push(card); // Push each card into the array
        })
        .then(() => {
            res.status(200).json(cards); // Respond with the collected array
        })
        .catch((err) => {
            console.error('Error fetching documents:', err);
            res.status(500).json({ error: 'Could not fetch the documents' });
        });
});

// Payment route
app.post('/api/process_payment', async (req, res) => {
    const { card_uid, amount } = req.body; // Extract card UID and amount from request body

    if (!card_uid || !amount) {
        return res.status(400).json({ success: false, message: 'Missing card_uid or amount' });
    }

    try {
        const card = await db.collection('cards').findOne({ card_uid }); // Find the card
        if (!card) {
            return res.status(404).json({ success: false, message: "Card not found" });
        }

        if (card.balance >= amount) {
            // Deduct the amount from the balance
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
            res.status(400).json({
                success: false,
                message: "Insufficient balance"
            });
        }
    } catch (error) {
        console.error("Error processing payment:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});