const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connection successful'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

const itemRoutes = require('./routes/item.route');
const expenseRoutes = require('./routes/expenseRoutes');
const authRoutes = require('./routes/authRoutes');
const chatRoutes = require('./routes/chatRoutes');
const portfolioRoutes = require('./routes/portfolioRoutes');
const stockRoutes = require('./routes/stockRoutes');
const { protect } = require('./middleware/authMiddleware');

app.use('/api/items', itemRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/chat', protect, chatRoutes);
app.use('/api/portfolio', protect, portfolioRoutes);
app.use('/api/stock', protect, stockRoutes);
app.use('/api/expenses', protect, expenseRoutes); 

app.get('/api/ping', (req, res) => {
  res.json({ message: 'pong', timestamp: new Date() });
});

app.get('/', (req, res) => {
  res.send('MERN Backend API is running.');
});

// Start Server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

module.exports = app;
