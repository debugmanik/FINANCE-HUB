const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.join(__dirname, '../.env') });

const Portfolio = require('../models/Portfolio');

const mergeDuplicates = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // 1. Group by userId and symbol
        const duplicates = await Portfolio.aggregate([
            {
                $group: {
                    _id: { userId: "$userId", symbol: "$symbol" },
                    count: { $sum: 1 },
                    ids: { $push: "$_id" },
                    totalQty: { $sum: "$quantity" },
                    totalInvested: { $sum: "$totalInvested" },
                    latestPrice: { $last: "$currentPrice" },
                    latestUpdate: { $last: "$lastPriceUpdated" },
                    latestName: { $last: "$stockName" },
                    latestDate: { $last: "$date" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        console.log(`Found ${duplicates.length} duplicate symbol sets to merge.`);

        for (const duplicate of duplicates) {
            const { userId, symbol } = duplicate._id;
            const [keepId, ...removeIds] = duplicate.ids;

            console.log(`Merging ${duplicate.count} entries for ${symbol} (User: ${userId})...`);

            // Update the record we're keeping with merged values
            await Portfolio.findByIdAndUpdate(keepId, {
                quantity: duplicate.totalQty,
                totalInvested: Math.round(duplicate.totalInvested * 100) / 100, // Round precisely
                currentPrice: duplicate.latestPrice,
                lastPriceUpdated: duplicate.latestUpdate,
                stockName: duplicate.latestName,
                date: duplicate.latestDate
            });

            // Remove the duplicates
            await Portfolio.deleteMany({ _id: { $in: removeIds } });
            console.log(`Successfully merged ${symbol}.`);
        }

        console.log('Cleanup complete.');
        process.exit(0);

    } catch (err) {
        console.error('Migration Error:', err);
        process.exit(1);
    }
};

mergeDuplicates();
