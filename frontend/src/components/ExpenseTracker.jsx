import { useState, useEffect, useMemo } from 'react';
import { getExpensesAPI, addExpenseAPI, editExpenseAPI, removeExpenseAPI } from '../services/api';
import { Plus, Wallet, Tag, Edit3, Trash2, CheckCircle, ChevronUp, ChevronDown, Filter, Rocket } from 'lucide-react';
import Modal from './Modal';

const CATEGORIES = ['All', 'Food', 'Transport', 'Utilities', 'Entertainment', 'Shopping', 'Health', 'Other'];

export default function ExpenseTracker({ onUpdate, income = 0 }) {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editId, setEditId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ show: false, id: null });
  const [actionLoading, setActionLoading] = useState(false);
  
  // Table Logic
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [activeFilter, setActiveFilter] = useState('All');

  const [formData, setFormData] = useState({
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const response = await getExpensesAPI();
      setExpenses(response.data);
    } catch (err) {
      setError('Failed to fetch expenses');
    } finally {
      setLoading(false);
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

  const filteredAndSortedExpenses = useMemo(() => {
    let result = [...expenses];
    
    // Filter
    if (activeFilter !== 'All') {
      result = result.filter(e => e.category === activeFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortConfig.key === 'date') {
        return sortConfig.direction === 'asc' 
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      }
      if (sortConfig.key === 'amount') {
        return sortConfig.direction === 'asc' ? a.amount - b.amount : b.amount - a.amount;
      }
      return 0;
    });

    return result;
  }, [expenses, sortConfig, activeFilter]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("Submitting expense:", formData);
    
    if (!formData.amount || isNaN(formData.amount) || Number(formData.amount) <= 0) {
      setError('Positive amount is required');
      return;
    }
    
    if (!formData.category || !formData.date) {
      setError('Category and date are mandatory');
      return;
    }

    setActionLoading(true);
    setError('');

    try {
      const dataToSubmit = {
        ...formData,
        amount: Number(formData.amount)
      };

      if (editId) {
        const response = await editExpenseAPI(editId, dataToSubmit);
        setExpenses(prev => prev.map(exp => exp._id === editId ? response.data : exp));
        showToast('Expense updated');
      } else {
        const response = await addExpenseAPI(dataToSubmit);
        setExpenses(prev => [response.data, ...prev]);
        showToast('Expense logged');
      }
      
      closeModal();
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Submission failed:", err);
      // HARDENING: Distinguish between validation errors and connection failures
      if (!err.response) {
        setError('Network Error: Server unreachable on port 5001');
      } else {
        setError(err.response.data?.message || 'Check fields and try again');
      }
    } finally {
      setActionLoading(true); // Wait for sync
      setTimeout(() => setActionLoading(false), 500);
    }
  };

  const openModal = (expense = null) => {
    if (expense) {
      setEditId(expense._id);
      setFormData({
        amount: expense.amount,
        category: expense.category,
        date: new Date(expense.date).toISOString().split('T')[0],
        description: expense.description || ''
      });
    } else {
      setEditId(null);
      setFormData({
        amount: '',
        category: 'Food',
        date: new Date().toISOString().split('T')[0],
        description: ''
      });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditId(null);
  };

  const handleDelete = async () => {
    const id = deleteConfirm.id;
    setActionLoading(true);
    try {
      await removeExpenseAPI(id);
      setExpenses(prev => prev.filter(exp => exp._id !== id));
      setDeleteConfirm({ show: false, id: null });
      showToast('Entry removed');
      if (onUpdate) onUpdate();
    } catch (err) {
      setError('Removal failed');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="relative h-full flex flex-col pt-4">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-2.5 rounded-full shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300">
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-bold tracking-tight">{toast}</span>
        </div>
      )}

      {/* Primary Actions & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 px-1">
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
          <Filter className="w-4 h-4 text-slate-300 shrink-0" />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveFilter(cat)}
              className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest whitespace-nowrap transition-all ${
                activeFilter === cat 
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-black shadow-md scale-105' 
                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        
        <button 
          onClick={() => openModal()}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-sm font-bold uppercase tracking-wider"
        >
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Elite Table */}
      <div className="flex-1 overflow-hidden flex flex-col bg-white dark:bg-transparent rounded-2xl">
        <div className="overflow-x-auto overflow-y-auto max-h-[600px] no-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-100 dark:border-white/5">
              <tr className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em]">
                <th className="px-6 py-5 font-bold">Category</th>
                <th 
                  className="px-6 py-5 cursor-pointer hover:text-slate-600 dark:hover:text-white transition-colors text-right"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1.5">
                    Amount (₹)
                    {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th 
                  className="px-6 py-5 cursor-pointer hover:text-slate-600 dark:hover:text-white transition-colors"
                  onClick={() => handleSort('date')}
                >
                  <div className="flex items-center gap-1.5">
                    Date
                    {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)}
                  </div>
                </th>
                <th className="px-6 py-5">Description</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {loading ? (
                Array(5).fill(0).map((_, i) => (
                  <tr key={i}><td colSpan="5" className="px-6 py-8"><div className="h-4 w-full skeleton" /></td></tr>
                ))
              ) : filteredAndSortedExpenses.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                      <Rocket className="w-12 h-12 text-slate-400" />
                      <p className="text-xl font-medium tracking-tight">Start tracking your expenses 🚀</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedExpenses.map((exp) => (
                  <tr key={exp._id} className="group hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-5 text-sm font-semibold text-slate-900 dark:text-white">{exp.category}</td>
                    <td className="px-6 py-5 text-sm font-bold text-slate-900 dark:text-white text-right font-mono">₹{exp.amount.toLocaleString('en-IN')}</td>
                    <td className="px-6 py-5 text-xs font-semibold text-slate-400 whitespace-nowrap">
                      {new Date(exp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-5 text-sm text-slate-500 max-w-xs truncate">{exp.description || '--'}</td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-4 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button 
                          onClick={() => openModal(exp)}
                          className="p-1.5 text-slate-400 hover:text-blue-500 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ show: true, id: exp._id })}
                          className="p-1.5 text-slate-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={closeModal} 
        title={editId ? 'Update Expense' : 'Log New Expense'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl animate-in shake duration-300">
               <p className="text-xs font-bold text-red-500 uppercase tracking-widest text-center">{error}</p>
            </div>
          )}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amount (₹)</label>
              <input
                type="number"
                name="amount"
                required
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-semibold transition-all"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Category</label>
              <select
                name="category"
                required
                value={formData.category}
                onChange={(e) => setFormData({...formData, category: e.target.value})}
                className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-semibold transition-all appearance-none"
              >
                {CATEGORIES.filter(c => c !== 'All').map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</label>
            <input
              type="date"
              name="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-semibold transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Description</label>
            <input
              type="text"
              name="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full bg-slate-50 dark:bg-white/5 border border-transparent focus:border-blue-500 rounded-xl px-4 py-3 text-sm font-semibold transition-all"
              placeholder="Private note..."
            />
          </div>
          <button
            type="submit"
            disabled={actionLoading}
            className="w-full bg-slate-900 dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50"
          >
            {actionLoading ? 'Synchronizing...' : (editId ? 'Apply Changes' : 'Confirm Entry')}
          </button>
        </form>
      </Modal>

      {/* Delete Confirmation Overlay */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 max-w-sm w-full shadow-2xl border border-gray-100 dark:border-white/5 animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-2">Delete Permanently?</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">This record will be removed from your financial history forever.</p>
            <div className="flex gap-4">
              <button 
                onClick={() => setDeleteConfirm({ show: false, id: null })}
                className="flex-1 px-4 py-3.5 rounded-2xl font-bold bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white hover:bg-slate-200 transition-colors"
              >
                No, Keep
              </button>
              <button 
                onClick={handleDelete}
                disabled={actionLoading}
                className="flex-1 px-4 py-3.5 rounded-2xl font-bold bg-red-500 text-white hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                {actionLoading ? '...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
