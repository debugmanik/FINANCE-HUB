import { useContext, useState, useEffect, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import { updateProfileAPI } from '../services/api';
import { LogOut, Wallet, TrendingUp, PiggyBank, ArrowDownWideNarrow, Edit3, IndianRupee, Sun, Moon } from 'lucide-react';
import ExpenseTracker from './ExpenseTracker';
import Portfolio from './Portfolio';
import Chat from './Chat';

export default function Dashboard({ metrics, onUpdate }) {
  const { user, logout } = useContext(AuthContext);
  const { theme, toggleTheme } = useContext(ThemeContext);
  
  const [activeTab, setActiveTab] = useState('expenses');
  const expenseRef = useRef(null);
  
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState('');

  const [hero, setHero] = useState({
    title: "Calculating...",
    details: "",
    status: 'neutral'
  });

  useEffect(() => {
    if (onUpdate) onUpdate();
  }, [activeTab, onUpdate]);

  useEffect(() => {
    computeHeroLogic();
  }, [metrics]);

  const computeHeroLogic = () => {
    if (!metrics) return;
    const { income, spending, balance, savingsRate } = metrics;
    const expenseRatio = income > 0 ? (spending / income) * 100 : 0;
    
    setTempIncome(income === 0 ? '' : income.toString());

    if (income === 0) {
      setHero({
        title: "Set your monthly income to begin.",
        details: "₹0 specified so far",
        status: 'neutral'
      });
    } else if (expenseRatio > 80) {
      setHero({
        title: `You've spent ${expenseRatio.toFixed(0)}%`,
        details: `₹${Number(spending).toLocaleString()} total spending`,
        status: 'red'
      });
    } else {
      setHero({
        title: `Saving ${savingsRate.toFixed(0)}% this month.`,
        details: `₹${(income - spending).toLocaleString()} remaining`,
        status: 'green'
      });
    }
  };

  const handleUpdateIncome = async () => {
    if (!tempIncome || isNaN(tempIncome)) return;
    try {
      await updateProfileAPI({ monthlyIncome: Number(tempIncome) });
      if (onUpdate) onUpdate();
      setIsEditingIncome(false);
    } catch (err) {
      console.error("Income update failed");
    }
  };

  const scrollToTable = () => {
    expenseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      
      {/* Safari-prefix added for backdrop-blur */}
      <header className="sticky top-0 z-40 bg-white/70 dark:bg-slate-950/70 border-b border-gray-100 dark:border-white/5 px-6 py-4 backdrop-blur-md" style={{ WebkitBackdropFilter: 'blur(12px)' }}>
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex flex-col">
            <h1 className="text-xl font-semibold tracking-tight">Finance Hub</h1>
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Unified Dashboard</p>
          </div>
          
          <div className="flex items-center gap-6">
            <button onClick={toggleTheme} className="p-2 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <div className="flex items-center gap-3 pl-6 border-l border-gray-100 dark:border-white/5">
              <span className="text-sm font-semibold">{user?.name}</span>
              <button onClick={logout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 lg:p-12 space-y-12">
        <section className="space-y-2">
          {!metrics?.loading && (
            <div className="space-y-1.5 animate-in fade-in transition-all duration-1000">
              <h2 className={`text-5xl font-semibold tracking-tight ${hero.status === 'red' ? 'text-red-500' : hero.status === 'green' ? 'text-emerald-500' : 'text-slate-900 dark:text-white'}`}>
                {hero.title}
              </h2>
              <p className="text-xl text-slate-400 font-medium">{hero.details}</p>
            </div>
          )}
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm transition-all duration-300">
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Income</p>
             {isEditingIncome ? (
               <input type="number" value={tempIncome} onChange={e => setTempIncome(e.target.value)} onBlur={handleUpdateIncome} className="w-full bg-transparent text-2xl font-bold outline-none" autoFocus />
             ) : (
               <div className="flex items-center gap-2" onClick={() => setIsEditingIncome(true)}>
                 <span className="text-2xl font-bold">₹{Number(metrics?.income || 0).toLocaleString()}</span>
                 <Edit3 className="w-3 h-3 text-slate-300" />
               </div>
             )}
          </div>
          
          <div onClick={scrollToTable} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm transition-all duration-300 cursor-pointer">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Spent</p>
            <span className="text-2xl font-bold">₹{Number(metrics?.spending || 0).toLocaleString()}</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm transition-all duration-300 font-bold">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Invested</p>
            <span className="text-2xl font-bold text-purple-500">₹{Number(metrics?.totalInvested || 0).toLocaleString()}</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm transition-all duration-300">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Balance</p>
            <span className={`text-2xl font-bold ${Number(metrics?.balance || 0) < 0 ? 'text-red-500' : 'text-slate-900'}`}>₹{Number(metrics?.balance || 0).toLocaleString()}</span>
          </div>

          <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm transition-all duration-300">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">Savings</p>
            <span className="text-2xl font-bold text-emerald-500">{Number(metrics?.savingsRate || 0).toFixed(0)}%</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div ref={expenseRef} className="lg:col-span-3 space-y-6">
            <div className="min-h-[600px]">
              {activeTab === 'expenses' ? (
                <ExpenseTracker onUpdate={onUpdate} income={metrics?.income || 0} />
              ) : (
                <Portfolio onUpdate={onUpdate} remainingBalance={metrics?.balance || 0} />
              )}
            </div>
          </div>

          <div className="space-y-8">
            <div className="bg-slate-50 dark:bg-white/5 rounded-3xl p-1 border border-gray-100 dark:border-white/10 flex shadow-sm">
                <button onClick={() => setActiveTab('expenses')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-[22px] ${activeTab === 'expenses' ? 'bg-white dark:bg-slate-800 text-blue-500' : 'text-slate-400'}`}>Expenses</button>
                <button onClick={() => setActiveTab('portfolio')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-[22px] ${activeTab === 'portfolio' ? 'bg-white dark:bg-slate-800 text-purple-500' : 'text-slate-400'}`}>Portfolio</button>
            </div>
            <div className="min-h-[420px]">
                <Chat theme={theme} isCompact={true} metrics={metrics} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
