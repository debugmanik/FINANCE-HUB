import { useEffect, useContext, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ThemeContext } from '../context/ThemeContext';
import Chat from './Chat';
import { Bot, ArrowLeft, Shield, Zap, BarChart3, PieChart } from 'lucide-react';

export default function DecisionHub({ metrics, onUpdate }) {
  const { theme } = useContext(ThemeContext);
  const navigate = useNavigate();

  const safeMetrics = useMemo(() => {
    return {
      income: 0,
      spending: 0,
      balance: 0,
      totalInvested: 0,
      portfolioValue: 0,
      savingsRate: 0,
      loading: false,
      ...metrics
    };
  }, [metrics]);

  useEffect(() => {
    console.log("DECISION HUB MOUNTED AT /decision-hub");
    if (onUpdate) onUpdate();
  }, [onUpdate]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-500 relative flex flex-col">
      
      {/* Strategic Header - Safari prefix added */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-slate-900/80 border-b border-gray-200 dark:border-white/5 px-8 py-6 shrink-0 w-full shadow-sm backdrop-blur-xl" style={{ WebkitBackdropFilter: 'blur(24px)' }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => navigate('/dashboard')}
              className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl hover:scale-105 active:scale-95 transition-all group"
            >
              <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />
            </button>
            <div className="flex flex-col">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-3">
                Strategic Hub <Shield className="w-6 h-6 text-blue-500" />
              </h1>
              <p className="text-xs text-slate-400 font-black uppercase mt-1 tracking-widest">
                {safeMetrics.loading ? 'Synchronizing Engine...' : 'Status: Operational'}
              </p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-6">
            <div className="flex flex-col items-end text-right">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Global Status</span>
              <span className={`text-sm font-black uppercase ${safeMetrics.balance >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {safeMetrics.balance >= 0 ? 'Surplus' : 'Deficit'}
              </span>
            </div>
            <div className="h-10 w-[1px] bg-gray-200 dark:bg-white/10" />
            <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/10">
              <Zap className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout - Constraints relaxed for Safari stability */}
      <main className="max-w-[1400px] mx-auto p-8 lg:p-12 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left: Strategic Context (40%) */}
          <div className="lg:col-span-4 space-y-8">
            <div className="p-8 rounded-[32px] bg-white dark:bg-slate-900 border border-gray-200 dark:border-white/5 shadow-xl space-y-8">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Allocation</h3>
              </div>
              
              <div className="space-y-6">
                {[
                  { label: "Monthly Income", value: safeMetrics.income, color: "text-slate-900 dark:text-white" },
                  { label: "Active Spending", value: safeMetrics.spending, color: "text-red-500" },
                  { label: "Deployed Capital", value: safeMetrics.totalInvested, color: "text-purple-500" },
                  { label: "Net Balance", value: safeMetrics.balance, color: safeMetrics.balance >= 0 ? "text-emerald-500" : "text-red-500" }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center group">
                    <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">{item.label}</span>
                    <span className={`text-xl font-black tabular-nums ${item.color}`}>₹{Number(item.value || 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-gray-100 dark:border-white/5">
                <div className="flex items-center gap-3 mb-6">
                  <PieChart className="w-5 h-5 text-blue-500" />
                  <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Efficiency</h3>
                </div>
                <div className="h-4 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600" 
                    style={{ width: `${Math.min(100, (Number(safeMetrics.totalInvested || 0) / (Number(safeMetrics.income || 1))) * 100)}%` }} 
                  />
                </div>
                <div className="mt-3 flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  <span>Investment Ratio</span>
                  <span>{((Number(safeMetrics.totalInvested || 0) / (Number(safeMetrics.income || 1))) * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            <div className="p-8 rounded-[32px] bg-blue-600/5 dark:bg-blue-600/10 border border-blue-500/20 shadow-sm relative overflow-hidden group">
               <Bot className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 text-blue-600" />
               <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4">Strategic Engine</h4>
               <p className="text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                 AI Advisor is synchronized globally.
               </p>
            </div>
          </div>

          <div className="lg:col-span-8 min-h-[600px]">
            <Chat 
              theme={theme} 
              isCompact={false} 
              onExpand={() => navigate('/dashboard')}
              metrics={safeMetrics}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
