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

// Default route to display cards in a table
app.get('/', (req, res) => {
    db.collection('cards')
        .find()
        .toArray()
        .then((cards) => {
            let html = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>Cards</title>
                    <style>
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            margin: 20px 0;
                            font-size: 1em;
                            text-align: left;
                        }
                        table th, table td {
                            padding: 12px;
                            border: 1px solid #ddd;
                        }
                        table th {
                            background-color: #f4f4f4;
                        }
                    </style>
                </head>
                <body>
                    <h1>Cards Table</h1>
                    <table>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Card UID</th>
                                <th>Name</th>
                                <th>Balance</th>
                                <th>Transactions</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            cards.forEach((card) => {
                html += `
                    <tr>
                        <td>${card._id}</td>
                        <td>${card.card_uid}</td>
                        <td>${card.name}</td>
                        <td>${card.balance}</td>
                        <td>
                            <ul>
                                ${card.transactions
                                    .map(
                                        (t) =>
                                            `<li>${t.time} - ${t.receiver} - $${t.value}</li>`
                                    )
                                    .join('')}
                            </ul>
                        </td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </body>
                </html>
            `;

            res.send(html);
        })
        .catch((err) => {
            console.error('Error fetching documents:', err);
            res.status(500).send('Internal Server Error');
        });
});

// Fetch all cards
app.get('/cards', (req, res) => {
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
                {
                    $inc: { balance: -amount },
                    $push: {
                        transactions: {
                            time: new Date(), // Add the current timestamp
                            receiver: "Store", // Replace with actual receiver data
                            value: amount // Add the transaction value
                        }
                    }
                }
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
