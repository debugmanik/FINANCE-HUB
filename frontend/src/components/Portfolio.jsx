import { useState, useEffect, useMemo, useRef } from 'react';
import api, { getPortfolioAPI, addPortfolioAPI, removePortfolioAPI, searchStocksAPI } from '../services/api';
import { Briefcase, Plus, Trash2, TrendingUp, Edit3, X, CheckCircle, ChevronUp, ChevronDown, RefreshCw, AlertCircle, Search, Loader2, Save, MoreVertical } from 'lucide-react';
import Modal from './Modal';

// Helper for currency formatting
const formatCurrency = (val) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(val || 0);
};

// Helper for time ago
const getTimeAgo = (date, current) => {
  if (!date) return 'Never';
  const diff = Math.floor((current - new Date(date)) / 60000); // mins
  if (diff < 1) return 'Just now';
  if (diff < 60) return `${diff}m ago`;
  if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
  return `${Math.floor(diff / 1440)}d ago`;
};

export default function Portfolio({ onUpdate, remainingBalance }) {
  const [portfolio, setPortfolio] = useState([]);
  const [summary, setSummary] = useState({ totalInvested: 0, totalCurrentValue: 0, totalPnL: 0, roi: 0 });
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Inline Edit States
  const [editingId, setEditingId] = useState(null);
  const [tempPrice, setTempPrice] = useState('');
  const [saveStatus, setSaveStatus] = useState({}); // { id: 'saving' | 'saved' | 'error' }

  const [sortConfig, setSortConfig] = useState({ key: 'totalInvested', direction: 'desc' });

  // Search/Autocomplete States
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  
  const dropdownRef = useRef(null);
  const searchInputRef = useRef(null);
  const latestSearchRef = useRef('');

  const [formData, setFormData] = useState({
    stockName: '',
    symbol: '',
    quantity: '',
    buyPrice: ''
  });

  const [isManual, setIsManual] = useState(false);

  // Time refresh every 60s
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchPortfolio();
  }, []);

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      const res = await getPortfolioAPI();
      setPortfolio(res.data.investments);
      setSummary(res.data.summary);
    } catch (err) {
      console.error('Failed to fetch portfolio', err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced Search
  useEffect(() => {
    const query = formData.stockName.trim();
    if (query.length < 2) {
      setSearchResults([]);
      setShowDropdown(false);
      return;
    }

    latestSearchRef.current = query;
    const timeout = setTimeout(async () => {
      setIsSearching(true);
      setShowDropdown(true);
      try {
        const res = await searchStocksAPI(query);
        if (latestSearchRef.current === query) {
          setSearchResults(res.data || []);
          setActiveIndex(-1);
        }
      } catch (err) {
        console.error('Search failed', err);
      } finally {
        if (latestSearchRef.current === query) {
          setIsSearching(false);
        }
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [formData.stockName]);

  const handleStockSelect = (stock) => {
    let symbol = stock.symbol.toUpperCase();
    if (!symbol.includes('.')) symbol += '.NS';
    setFormData(prev => ({ ...prev, stockName: stock.name, symbol, buyPrice: '' }));
    setShowDropdown(false);
  };

  const handlePriceUpdate = async (id, newPrice) => {
    const asset = portfolio.find(p => p._id === id);
    const price = parseFloat(newPrice);

    if (isNaN(price) || price <= 0 || price > 10000000) {
      setSaveStatus(prev => ({ ...prev, [id]: 'error' }));
      setTimeout(() => setSaveStatus(prev => ({ ...prev, [id]: null })), 2000);
      return;
    }

    if (price === asset.currentPrice) {
      setEditingId(null);
      return;
    }

    // Optimistic UI Update
    setSaveStatus(prev => ({ ...prev, [id]: 'saving' }));
    const originalPortfolio = [...portfolio];
    const originalSummary = { ...summary };

    const updatedPortfolio = portfolio.map(p => {
      if (p._id === id) {
        const currentValue = p.quantity * price;
        const profitLoss = currentValue - p.totalInvested;
        return {
          ...p,
          currentPrice: price,
          currentValue,
          profitLoss,
          lastPriceUpdated: new Date().toISOString()
        };
      }
      return p;
    });

    setPortfolio(updatedPortfolio);
    setEditingId(null);

    try {
      await api.put(`/api/portfolio/${id}/price`, { currentPrice: price });
      setSaveStatus(prev => ({ ...prev, [id]: 'saved' }));
      
      // Recalculate summary locally for immediate feedback
      const newTotalCurrentValue = updatedPortfolio.reduce((acc, p) => acc + (p.currentValue || 0), 0);
      setSummary(prev => ({
        ...prev,
        totalCurrentValue: newTotalCurrentValue,
        totalPnL: newTotalCurrentValue - prev.totalInvested
      }));

      setTimeout(() => setSaveStatus(prev => ({ ...prev, [id]: null })), 2000);
      if (onUpdate) onUpdate();
    } catch (err) {
      setPortfolio(originalPortfolio);
      setSummary(originalSummary);
      setSaveStatus(prev => ({ ...prev, [id]: 'error' }));
      showToast('Failed to update price');
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedPortfolio = useMemo(() => {
    let result = [...portfolio];
    result.sort((a, b) => {
      const valA = a[sortConfig.key] || 0;
      const valB = b[sortConfig.key] || 0;
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });
    return result;
  }, [portfolio, sortConfig]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.stockName || !formData.symbol || !formData.quantity || !formData.buyPrice) return;

    const qty = parseFloat(formData.quantity);
    const price = parseFloat(formData.buyPrice);
    const cost = qty * price;
    const limit = (remainingBalance || 0);

    if (cost > limit) {
      showToast(`Investment (₹${cost.toFixed(2)}) exceeds balance`);
      return;
    }

    setActionLoading(true);
    try {
      await addPortfolioAPI({
        ...formData,
        quantity: qty,
        buyPrice: price
      });
      showToast('Asset added successfully');
      fetchPortfolio();
      closeModal();
      if (onUpdate) onUpdate();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to add asset');
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setIsManual(false);
    setFormData({ stockName: '', symbol: '', quantity: '', buyPrice: '' });
  };

  const handleDelete = async () => {
    const id = deleteConfirm.id;
    setActionLoading(true);
    try {
      await removePortfolioAPI(id);
      showToast('Asset removed');
      fetchPortfolio();
      setDeleteConfirm({ show: false, id: null });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to delete investment', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="relative h-full flex flex-col pt-4 overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-bold tracking-tight">{toast}</span>
        </div>
      )}

      {/* Hero Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8 animate-in fade-in duration-700">
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-[32px] p-8 shadow-sm border border-gray-100 dark:border-white/10 flex flex-col justify-between group transition-all h-[240px]">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                <TrendingUp className="w-4 h-4 text-blue-500" /> Portfolio Valuation
              </div>
              <h3 className="text-5xl font-extrabold tracking-tighter tabular-nums text-slate-900 dark:text-white">
                {formatCurrency(summary.totalCurrentValue)}
              </h3>
            </div>
            <div className="flex flex-col items-end gap-1">
               <div className="px-3 py-1 rounded-full text-[10px] bg-slate-100 dark:bg-white/5 text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Manual Tracking
              </div>
            </div>
          </div>

          <div className="flex items-baseline gap-12 pt-6 border-t border-gray-50 dark:border-white/5 mt-6">
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Total P/L</p>
              <p className={`text-xl font-black flex items-center gap-1.5 tabular-nums ${summary.totalPnL >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {summary.totalPnL >= 0 ? '+' : '-'}{formatCurrency(Math.abs(summary.totalPnL))} 
                <span className="text-xs opacity-60">({summary.roi >= 0 ? '+' : ''}{summary.roi.toFixed(2)}%)</span>
              </p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">Cost Basis</p>
              <p className="text-xl font-black text-slate-900 dark:text-white tabular-nums">{formatCurrency(summary.totalInvested)}</p>
            </div>
          </div>
        </div>

        <div className="bg-slate-950 rounded-[32px] p-8 flex flex-col justify-between h-[240px] text-white overflow-hidden relative group">
           <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Briefcase className="w-32 h-32 rotate-12" />
           </div>
           <div className="relative z-10 space-y-4">
            <div className="space-y-1">
              <div className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em]">Live Assets</div>
              <div className="text-4xl font-black tabular-nums tracking-tighter">{portfolio.length}</div>
            </div>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-white text-black rounded-2xl shadow-xl active:scale-95 transition-all text-[11px] font-black uppercase tracking-widest"
          >
            <Plus className="w-4 h-4" /> New Acquisition
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="flex-1 overflow-hidden flex flex-col rounded-[32px] border border-gray-100 dark:border-white/5 bg-white dark:bg-transparent">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
              <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                <th className="px-6 py-6">Asset Details</th>
                <th 
                  className="px-6 py-6 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors text-right"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Qty
                    {sortConfig.key === 'quantity' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-6 py-6 text-right">Avg Buy (₹)</th>
                <th className="px-6 py-6 text-right">Current Price (₹)</th>
                <th 
                  className="px-6 py-6 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors text-right"
                  onClick={() => handleSort('totalCurrentValue')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Value
                  </div>
                </th>
                <th 
                  className="px-6 py-6 cursor-pointer hover:text-slate-900 dark:hover:text-white transition-colors text-right"
                  onClick={() => handleSort('profitLoss')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    P/L
                    {sortConfig.key === 'profitLoss' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-6 py-6 w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan="7" className="px-6 py-8">
                       <div className="h-10 bg-slate-100 dark:bg-white/5 rounded-2xl w-full" />
                    </td>
                  </tr>
                ))
              ) : portfolio.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-40 text-center">
                    <div className="flex flex-col items-center gap-6 opacity-30 grayscale">
                       <Plus className="w-16 h-16 bg-slate-100 dark:bg-white/5 p-4 rounded-full" />
                       <p className="text-2xl font-black uppercase tracking-tighter">No Assets Tracked</p>
                       <p className="text-xs font-bold tracking-widest text-blue-500">Add your first investment 🚀</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedPortfolio.map((asset) => {
                  const isProfit = (asset.profitLoss || 0) >= 0;
                  const isEditing = editingId === asset._id;
                  const status = saveStatus[asset._id];
                  
                  return (
                    <tr key={asset._id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors border-l-4 border-transparent hover:border-blue-500">
                      <td className="px-6 py-6">
                        <div className="flex flex-col">
                           <span className="text-[13px] font-black text-slate-900 dark:text-white tracking-tight">{asset.stockName}</span>
                           <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">{asset.symbol}</span>
                        </div>
                      </td>
                      <td className="px-6 py-6 text-sm font-black text-right tabular-nums dark:text-white">{asset.quantity}</td>
                      <td className="px-6 py-6 text-[13px] font-bold text-right tabular-nums dark:text-white">{formatCurrency(asset.avgPrice)}</td>
                      <td className="px-6 py-6 text-right">
                        <div className="flex flex-col items-end gap-1">
                          {isEditing ? (
                            <div className="relative">
                              <input
                                autoFocus
                                type="number"
                                step="any"
                                value={tempPrice}
                                onChange={(e) => setTempPrice(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handlePriceUpdate(asset._id, tempPrice);
                                  if (e.key === 'Escape') setEditingId(null);
                                }}
                                onBlur={() => handlePriceUpdate(asset._id, tempPrice)}
                                className="w-32 bg-white dark:bg-slate-800 border-2 border-blue-500 rounded-xl px-3 py-1.5 text-right text-[13px] font-black outline-none shadow-lg"
                              />
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setEditingId(asset._id);
                                setTempPrice(asset.currentPrice.toString());
                              }}
                              className="group/btn flex flex-col items-end"
                            >
                               <span className="text-[13px] font-black tabular-nums dark:text-white border-b border-dotted border-slate-300 dark:border-white/20 group-hover/btn:border-blue-500 transition-colors">
                                  {formatCurrency(asset.currentPrice)}
                               </span>
                               <span className="text-[9px] font-bold text-slate-400 group-hover/btn:text-blue-500 transition-colors mt-0.5">
                                 {status === 'saving' ? 'Saving...' : status === 'saved' ? 'Saved ✓' : getTimeAgo(asset.lastPriceUpdated, currentTime)}
                               </span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-6 text-[13px] font-black text-right tabular-nums dark:text-white">{formatCurrency(asset.currentValue)}</td>
                      <td className="px-6 py-6 text-right">
                         <div className={`px-4 py-2 rounded-xl text-[11px] font-black tabular-nums inline-block border ${isProfit ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                           {isProfit ? '+' : ''}{formatCurrency(asset.profitLoss)}
                         </div>
                      </td>
                      <td className="px-6 py-6 text-right">
                         <button 
                            onClick={() => setDeleteConfirm({ show: true, id: asset._id })}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                         >
                            <Trash2 className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} title={<h2 className="text-xl font-black tracking-tight">New Holding</h2>}>
         <div className="mb-8 flex bg-slate-100 dark:bg-white/5 p-1.5 rounded-2xl">
            <button 
              onClick={() => setIsManual(false)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${!isManual ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Search Stock
            </button>
            <button 
              onClick={() => setIsManual(true)}
              className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isManual ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Add Manually
            </button>
         </div>

         <form onSubmit={handleSubmit} className="space-y-6">
            {!isManual ? (
              <div className="relative">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">Discover Asset</label>
                <div className="relative group">
                  <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isSearching ? 'text-blue-500 animate-pulse' : 'text-slate-400'}`} />
                  <input
                    type="text"
                    autoComplete="off"
                    value={formData.stockName}
                    onChange={(e) => setFormData({ ...formData, stockName: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-[20px] pl-12 py-4 text-sm font-bold transition-all outline-none"
                    placeholder="e.g. Reliance, TCS"
                  />
                </div>

                {showDropdown && (
                  <div className="absolute left-0 right-0 top-full mt-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/10 rounded-[24px] shadow-2xl z-[110] max-h-60 overflow-y-auto no-scrollbar py-2">
                    {searchResults.map((stock) => (
                      <button
                        key={stock.symbol}
                        type="button"
                        onClick={() => handleStockSelect(stock)}
                        className="w-full px-6 py-4 flex flex-col hover:bg-blue-600 group hover:text-white text-left transition-all"
                      >
                        <span className="text-sm font-black tracking-tight">{stock.name}</span>
                        <span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-100">{stock.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-top-4 duration-500">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Stock Name</label>
                  <input
                    type="text"
                    required
                    value={formData.stockName}
                    onChange={(e) => setFormData({...formData, stockName: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-2xl px-4 py-4 text-sm font-bold transition-all outline-none"
                    placeholder="e.g. Reliance Industries"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-1 px-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Symbol</label>
                    <span className="text-[8px] font-bold text-blue-500 tracking-tighter">e.g. TCS.NS</span>
                  </div>
                  <input
                    type="text"
                    required
                    value={formData.symbol}
                    onChange={(e) => setFormData({...formData, symbol: e.target.value.toUpperCase()})}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-2xl px-4 py-4 text-sm font-bold transition-all outline-none"
                    placeholder="RELIANCE.NS"
                  />
                  <p className="text-[9px] font-medium text-slate-400 px-1">Use accurate symbol for tracking (e.g. TCS.NS, INFYS.NS)</p>
                </div>
              </div>
            )}

            {formData.symbol && (
              <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-4 duration-500">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Quantity</label>
                  <input
                    type="number"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({...formData, quantity: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-2xl px-4 py-4 text-sm font-bold transition-all outline-none"
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Buy Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.buyPrice}
                    onChange={(e) => setFormData({...formData, buyPrice: e.target.value})}
                    className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-2xl px-4 py-4 text-sm font-bold transition-all outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={actionLoading || !formData.symbol}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 rounded-[22px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-30 text-[11px]"
            >
              {actionLoading ? 'Updating Ledger...' : 'Build Position'}
            </button>
         </form>
      </Modal>

      {/* Delete Confirmation */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-white/5">
            <h3 className="text-2xl font-black tracking-tighter mb-2">Offload Asset?</h3>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed font-medium">This will permanently terminate the tracking node for this asset.</p>
            <div className="flex gap-4">
              <button onClick={() => setDeleteConfirm({ show: false, id: null })} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-slate-100 dark:bg-white/5 transition-colors">Abort</button>
              <button onClick={handleDelete} className="flex-1 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-red-500 text-white shadow-lg shadow-red-500/20 transition-all active:scale-95">Liquidate</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
