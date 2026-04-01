import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getChatAPI, sendChatAPI } from '../services/api';
import ReactMarkdown from 'react-markdown';
import { Send, Bot, Zap, ArrowRight, Loader2, TrendingUp, Shield, Activity } from 'lucide-react';

export default function Chat({ theme, isCompact = false, onExpand, metrics }) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 0. LOAD SESSION HISTORY
  useEffect(() => {
    if (isCompact) return;
    const fetchHistory = async () => {
      try {
        const res = await getChatAPI();
        if (res.data?.messages) setMessages(res.data.messages);
      } catch (err) { console.error("History Stalled"); }
    };
    fetchHistory();
  }, [isCompact]);


  // 1. ELITE HYBRID REAL-TIME ALLOCATION ENGINE (0ms)
  const localInsight = useMemo(() => {
    if (!metrics || metrics.loading) return null;
    
    const { income, spending, balance, totalInvested, portfolioValue } = metrics;
    const profitLoss = portfolioValue - totalInvested;
    const isSurplus = balance >= 0;
    const isZero = income === 0;

    if (isZero) {
      return {
        status: "Profile setup required",
        type: "idle",
        grid: { INCOME: 0, SPENT: spending, INVESTED: totalInvested, REMAINING: balance },
        footnote: { VALUE: portfolioValue, PL: profitLoss },
        move: "Set monthly income",
        insight: "Set your income to enable strategic allocation logic."
      };
    }

    if (isSurplus) {
      const investAmount = Math.round(balance * 0.7);
      const bufferAmount = balance - investAmount;
      return {
        status: "Surplus detected — capital underutilized",
        type: "surplus",
        grid: { INCOME: income, SPENT: spending, INVESTED: totalInvested, REMAINING: balance },
        footnote: { VALUE: portfolioValue, PL: profitLoss },
        move: (
          <>
            Deploy ₹{investAmount.toLocaleString()} (70%) into investments<br />
            Retain ₹{bufferAmount.toLocaleString()} (30%) as liquidity buffer
          </>
        ),
        insight: "Capital is underutilized. Deploy surplus to improve efficiency."
      };
    } else {
      const deficit = Math.abs(balance);
      return {
        status: "Deficit detected — liquidity at risk",
        type: "deficit",
        grid: { INCOME: income, SPENT: spending, INVESTED: totalInvested, REMAINING: balance },
        footnote: { VALUE: portfolioValue, PL: profitLoss },
        move: totalInvested > 0 ? `Liquidate ₹${deficit.toLocaleString()} from assets` : `Reduce expenses by ₹${deficit.toLocaleString()}`,
        insight: "Overspending detected. Immediate correction required."
      };
    }
  }, [metrics]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await sendChatAPI(input);
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "Financial engine offline. Try again." }]);
    } finally { setLoading(false); }
  };

  // Elite Hybrid Dashboard UI (0ms Dashboard Sync)
  if (isCompact) {
    if (!localInsight) return null;

    return (
      <div className="flex flex-col h-full bg-white dark:bg-slate-900 rounded-[32px] overflow-hidden border border-gray-200 dark:border-white/10 shadow-2xl transition-all">
        {/* Header Section */}
        <div className="p-5 border-b border-gray-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
          <div className="flex flex-col">
            <span className="text-[8px] font-black p-0 uppercase tracking-[0.2em] text-slate-400 leading-none mb-1.5">Strategy Engine</span>
             <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">Real-Time Allocation</h3>
                <div className="flex items-center gap-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
                   <Zap className="w-3.5 h-3.5 text-blue-500 fill-blue-500/10" />
                </div>
             </div>
          </div>
        </div>

        {/* Status Banner */}
        <div className={`px-5 py-2.5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between shrink-0 bg-slate-900 dark:bg-blue-600/10`}>
          <span className="text-[10px] font-bold text-blue-500 dark:text-blue-400 capitalize">{localInsight.status}</span>
        </div>

        <div className="flex-1 p-5 overflow-y-auto no-scrollbar">
          <div className="space-y-6">
            {/* 2x2 Metrics Grid */}
            <div className="grid grid-cols-2 gap-y-4 gap-x-2">
               {Object.entries(localInsight.grid).map(([label, val]) => (
                 <div key={label} className="space-y-0.5">
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</p>
                   <p className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">₹{val.toLocaleString()}</p>
                 </div>
               ))}
            </div>

            {/* Portfolio Footnote */}
            <div className="pt-4 border-t border-gray-100 dark:border-white/5 flex justify-between">
               <div className="flex flex-col">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Value</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">₹{localInsight.footnote.VALUE.toLocaleString()}</span>
               </div>
               <div className="flex flex-col text-right">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">P/L (unrealized)</span>
                  <span className={`text-xs font-bold tabular-nums ${localInsight.footnote.PL >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ₹{localInsight.footnote.PL.toLocaleString()}
                  </span>
               </div>
            </div>

            {/* Strategic Moves Section */}
            <div className="pt-2 space-y-3">
               <div className="space-y-1">
                 <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Move</h4>
                  <div className={`text-sm font-bold leading-tight ${localInsight.type === 'deficit' ? 'text-red-500' : 'text-blue-600 dark:text-blue-400'}`}>
                    {localInsight.move}
                  </div>
               </div>
               
               {/* Intelligence Layer / Smart Line */}
               <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 border-l-2 border-slate-200 dark:border-white/10 pl-3 leading-snug">
                  {localInsight.insight}
               </p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => navigate('/decision-hub')}
          className="w-full py-5 border-t border-gray-100 dark:border-white/10 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-white/5 transition-all flex items-center justify-center gap-2 bg-white dark:bg-slate-900"
        >
          Decision Hub <ArrowRight className="w-3 h-3" />
        </button>
      </div>
    );
  }

  // Full History View
  return (
    <div className="flex flex-col h-full min-h-[600px] w-full bg-white dark:bg-slate-900 overflow-hidden rounded-[32px] border border-gray-200 dark:border-white/10 shadow-2xl transition-all">
      <div className="p-8 border-b border-gray-100 dark:border-white/10 flex items-center justify-between shrink-0 bg-slate-50/50 dark:bg-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20"><Bot className="w-6 h-6 text-white" /></div>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Financial Advisor</h3>
            <p className="text-[10px] font-black text-slate-400 dark:text-gray-500 uppercase tracking-widest mt-1">Live AI Chat Mode</p>
          </div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar bg-white dark:bg-slate-950/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-6 rounded-[24px] ${m.role === 'user' ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/10' : 'bg-slate-50 dark:bg-white/5 border border-gray-100 dark:border-white/5'}`}>
              <div className="prose dark:prose-invert prose-sm font-bold leading-relaxed">
                <ReactMarkdown>{m.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}
        {loading && <div className="flex items-center gap-3 p-6 bg-slate-50 dark:bg-white/5 rounded-2xl"><Loader2 className="w-4 h-4 animate-spin text-blue-500" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Strategizing...</span></div>}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSend} className="p-8 border-t border-gray-100 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 relative">
        <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask for capital advice..." className="w-full p-6 pr-20 bg-white dark:bg-slate-800 border border-gray-200 dark:border-white/5 rounded-3xl text-sm font-bold shadow-sm outline-none" />
        <button type="submit" disabled={loading} className="absolute right-11 top-11 p-3 bg-blue-600 text-white rounded-2xl shadow-lg flex items-center justify-center transition-all active:scale-95"><Send className="w-5 h-5" /></button>
      </form>
    </div>
  );
}