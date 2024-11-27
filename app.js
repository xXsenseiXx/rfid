const express = require('express');
const { connectToDb, getDb } = require('./db');

const app = express();

app.use(express.json());

let db;
connectToDb((err) => {
    if (!err) {
        db = getDb();
    }
});

app.get('/cards', (req, res) => {
    let cards = [];
    db.collection('cards')
        .find()
        .forEach((card) => {
            cards.push(card);
        })
        .then(() => {
            res.status(200).json(cards);
        })
        .catch((err) => {
            res.status(500).json({ error: 'Could not fetch the documents' });
        });
});

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
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});

app.post('/cards', (req, res) => {
    const card = req.body;
    db.collection('cards')
        .insertOne(card)
        .then((result) => {
            res.status(201).json(result);
        })
        .catch(() => {
            res.status(500).json({ err: 'Could not create a new doc' });
        });
});