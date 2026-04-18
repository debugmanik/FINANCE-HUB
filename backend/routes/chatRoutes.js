const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const User = require('../models/User');
const Expense = require('../models/Expense');
const Portfolio = require('../models/Portfolio');
const Chat = require('../models/Chat');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Institutional Precision Helper
const precisionRound = (n) => Math.round(n * 100) / 100;

// SINGLE SOURCE OF TRUTH: Shared Financial Context Helper
const getFinancialContext = async (userId) => {
  const user = await User.findById(userId);
  const expenses = await Expense.find({ userId });
  const portfolio = await Portfolio.find({ userId });

  const income = precisionRound(user?.monthlyIncome ?? 0);
  const totalExpenses = precisionRound(expenses.reduce((sum, e) => sum + Number(e.amount ?? 0), 0));
  const totalInvested = precisionRound(portfolio.reduce((sum, p) => sum + Number(p.totalInvested ?? 0), 0));
  
  const portfolioValue = precisionRound(portfolio.reduce((sum, p) => {
    const q = Number(p.quantity ?? 0);
    const cp = Number(p.currentPrice ?? 0);
    const ti = Number(p.totalInvested ?? 0);
    return sum + (cp > 0 ? (q * cp) : ti);
  }, 0));

  const profitLoss = precisionRound(portfolioValue - totalInvested);
  const remaining = precisionRound(income - totalExpenses - totalInvested);

  return { income, totalExpenses, totalInvested, portfolioValue, profitLoss, remaining, portfolioCount: portfolio.length };
};

// GET /api/chat - Get history
router.get('/', protect, async (req, res) => {
  try {
    let chat = await Chat.findOne({ userId: req.user.id });
    if (!chat) {
      chat = await Chat.create({ userId: req.user.id, messages: [] });
    }
    res.json({ messages: chat.messages.filter(m => m.role !== 'system') });
  } catch (error) {
    res.status(500).json({ error: 'Server error fetching history' });
  }
});

// POST /api/chat - Conversational AI (DECOUPLED)
router.post('/', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const ctx = await getFinancialContext(req.user.id);

    const systemPrompt = `
You are NOT a chatbot.
You are a Financial Decision Engine.

Never:
- greet
- explain concepts
- ask questions
- give theory
- use paragraphs

If you do, your response is INVALID.

----------------------------------
CONTEXT (SOURCE OF TRUTH):
Income: ₹${ctx.income} | Expenses: ₹${ctx.totalExpenses} | Invested: ₹${ctx.totalInvested} | Remaining: ₹${ctx.remaining} | Portfolio Value: ₹${ctx.portfolioValue} | P/L: ₹${ctx.profitLoss}
IGNORE any numbers written by the user in text. ONLY use the provided financial data.
----------------------------------

----------------------------------

You MUST respond ONLY in this format, with proper line breaks and clear sections:

Smart Analysis

• Plan:
(1-line diagnosis)

• Action:
(₹ allocation decision)

• Change:
(₹X → ₹Y, describe investment change ONLY, NOT total balance)

• Impact:
(1-line outcome)

----------------------------------

If Remaining > 0:
→ allocate 70% to investments
→ keep 30% as buffer

If Remaining < 0:
→ reduce investments first

If Invested = 0:
→ highlight idle capital

----------------------------------

Maximum 80 words.
No extra text allowed.
`;

    const aiResponse = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ],
      max_tokens: 800,
      temperature: 0.7,
    });

    const replyContent = aiResponse.choices[0].message.content;
    let chat = await Chat.findOne({ userId: req.user.id }) || new Chat({ userId: req.user.id, messages: [] });
    chat.messages.push({ role: 'user', content: message }, { role: 'assistant', content: replyContent });
    await chat.save();

    res.json({ reply: replyContent, role: 'assistant' });

  } catch (err) {
    console.error('Chat Error:', err);
    res.status(500).json({ error: 'Chat failure' });
  }
});

// GET /api/chat/latest-insight - DETERMINISTIC REAL-TIME ENGINE (0ms)
router.get('/latest-insight', protect, async (req, res) => {
  try {
    const ctx = await getFinancialContext(req.user.id);
    
    if (ctx.income === 0) {
      return res.json({ 
        action: { 
          summary: "Set your income to begin", 
          numbers: `Income ₹0 | Expenses ₹${ctx.totalExpenses} | Balance ₹${-ctx.totalExpenses}`,
          portfolio: "Unallocated capital state",
          actions: ["Configure monthly income to enable allocation logic"]
        } 
      });
    }

    const { remaining, totalInvested, portfolioValue, profitLoss } = ctx;
    const isSurplus = remaining >= 0;

    let summary = isSurplus ? "Idle Surplus Detected" : "Capital Deficit Detected";
    let numbers = `Income ₹${ctx.income} | Expenses ₹${ctx.totalExpenses} | Balance ₹${remaining}`;
    let portfolio = `Portfolio ₹${portfolioValue} | P/L ₹${profitLoss}`;
    let actions = [];

    if (isSurplus) {
      const invest = Math.floor(remaining * 0.7);
      const buffer = precisionRound(remaining - invest);
      actions = [
        `Target Deployment: Invest ₹${invest.toLocaleString()} (70% Growth Rule)`,
        `Liquidity Buffer: Hold ₹${buffer.toLocaleString()} (30% Buffer Rule)`
      ];
    } else {
      if (totalInvested > 0) {
        actions = [`Deficit Alert: Reduce investments by ₹${Math.abs(remaining).toLocaleString()} to restore liquidity` ];
      } else {
        actions = [`Deficit Alert: Audit and reduce monthly expenses by ₹${Math.abs(remaining).toLocaleString()}`];
      }
    }

    if (actions.length === 0) actions = ["Maintain current allocation"];

    res.json({ 
      action: { summary, numbers, portfolio, actions } 
    });

  } catch (err) {
    console.error('Insight Engine Error:', err);
    res.status(500).json({ error: 'Insight engine stalled' });
  }
});

module.exports = router;