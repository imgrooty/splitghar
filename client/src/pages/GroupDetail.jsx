import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Plus, Receipt, ArrowRight, User, Calendar, CreditCard } from 'lucide-react';
import api from '../services/api';
import socket from '../services/socket';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

const GroupDetail = () => {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Expense State
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [splitType, setSplitType] = useState('equal');
  const [customSplits, setCustomSplits] = useState({});

  useEffect(() => {
    fetchGroup();
    
    // Socket real-time connection
    socket.connect();
    socket.emit('join_group', id);
    
    socket.on('balance_update', ({ groupId }) => {
      if (groupId === id) {
        fetchGroup();
        toast.info('Group balance updated');
      }
    });

    return () => {
      socket.off('balance_update');
      socket.disconnect();
    };
  }, [id]);

  const fetchGroup = async () => {
    try {
      const res = await api.get(`/groups/${id}`);
      setGroup(res.data);
      setPaidBy(res.data.members[0]?.userId);
      // Initialize custom splits
      const initialSplits = {};
      res.data.members.forEach(m => initialSplits[m.userId] = '');
      setCustomSplits(initialSplits);
    } catch (err) {
      toast.error('Failed to load group');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    let splits = [];

    if (splitType === 'equal') {
      const perPerson = numAmount / group.members.length;
      splits = group.members.map(m => ({ userId: m.userId, amountOwed: perPerson }));
    } else if (splitType === 'custom') {
      splits = Object.entries(customSplits).map(([userId, amt]) => ({
        userId,
        amountOwed: parseFloat(amt) || 0
      }));
      const total = splits.reduce((sum, s) => sum + s.amountOwed, 0);
      if (Math.abs(total - numAmount) > 0.01) return toast.error('Total of splits must equal expense amount');
    } else if (splitType === 'percentage') {
      splits = Object.entries(customSplits).map(([userId, pct]) => ({
        userId,
        amountOwed: (numAmount * (parseFloat(pct) || 0)) / 100
      }));
      const totalPct = Object.values(customSplits).reduce((sum, p) => sum + (parseFloat(p) || 0), 0);
      if (Math.abs(totalPct - 100) > 0.01) return toast.error('Total percentage must equal 100%');
    }

    try {
      await api.post('/expenses', {
        groupId: id,
        description,
        amount: numAmount,
        paidBy,
        splitType,
        splits
      });
      toast.success('Expense added!');
      setIsModalOpen(false);
      resetForm();
      fetchGroup();
    } catch (err) {
      toast.error('Failed to add expense');
    }
  };

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setSplitType('equal');
  };

  if (loading) return <div className="flex justify-center py-20 text-primary font-bold">Loading...</div>;
  if (!group) return <div>Group not found</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link to="/groups" className="text-primary hover:underline text-sm font-bold">Groups</Link>
            <span className="text-slate-300">/</span>
            <span className="text-sm text-slate-500">{group.name}</span>
          </div>
          <h1 className="text-4xl font-display font-bold text-slate-900">{group.name}</h1>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary py-3 flex items-center gap-2">
          <Plus size={20} />
          Add Expense
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Expenses List */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="text-primary" />
            Expenses
          </h2>
          
          <div className="space-y-4">
            {group.expenses.length === 0 ? (
              <div className="p-12 text-center bg-white border border-dashed border-primary/20 rounded-3xl">
                <p className="text-slate-400">No expenses recorded yet.</p>
              </div>
            ) : (
              group.expenses.slice().reverse().map((expense) => (
                <div key={expense.id} className="bg-white border border-primary/5 p-6 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-surfaceSecondary flex items-center justify-center text-primary">
                      <CreditCard size={24} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{expense.description}</h4>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <User size={12} /> Paid by {expense.payer.name} • {new Date(expense.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-display font-bold text-slate-900">रु {expense.amount.toFixed(2)}</div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{expense.splitType} split</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Simplified Debts & Members */}
        <div className="space-y-8">
          {/* Simplified Debts Section */}
          <section className="bg-primary/5 rounded-3xl p-8 border border-primary/10">
            <h2 className="text-xl font-display font-bold text-primary mb-6 flex items-center gap-2">
              <ArrowRight size={20} />
              Simplified Debts
            </h2>
            <div className="space-y-4">
              {group.simplifiedDebts.length === 0 ? (
                <p className="text-sm text-slate-400 italic">Everything is settled! 🎉</p>
              ) : (
                group.simplifiedDebts.map((debt, idx) => {
                  const fromUser = group.members.find(m => m.userId === debt.from)?.user;
                  const toUser = group.members.find(m => m.userId === debt.to)?.user;
                  return (
                    <div key={idx} className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm border border-primary/5">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center -space-x-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border-2 border-white">
                            {fromUser?.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent font-bold text-xs border-2 border-white">
                            {toUser?.name.substring(0, 2).toUpperCase()}
                          </div>
                        </div>
                        <div className="text-sm">
                          <span className="font-bold text-slate-700">{fromUser?.name}</span>
                          <span className="text-slate-400 mx-1">→</span>
                          <span className="font-bold text-slate-700">{toUser?.name}</span>
                        </div>
                      </div>
                      <div className="text-primary font-bold">रु {debt.amount.toFixed(2)}</div>
                    </div>
                  );
                })
              )}
            </div>
            {group.simplifiedDebts.length > 0 && (
              <Link to="/settle" className="mt-8 btn-primary w-full text-center block">Settle Up Now</Link>
            )}
          </section>

          {/* Members List */}
          <section>
            <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Members</h3>
            <div className="space-y-3">
              {group.members.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 bg-white rounded-2xl border border-primary/5">
                  <div className="h-10 w-10 rounded-full bg-surfaceSecondary flex items-center justify-center text-primary font-bold text-xs">
                    {m.user.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-700 text-sm">{m.user.name}</p>
                    <p className="text-xs text-slate-400">{m.user.email}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-surface">
              <div>
                <h2 className="text-2xl font-display font-bold text-slate-900">Add Expense</h2>
                <p className="text-slate-500">Record a new payment for the group.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-900">✕</button>
            </div>
            
            <form onSubmit={handleAddExpense} className="flex-1 overflow-y-auto p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Description</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-surfaceSecondary border border-primary/5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="e.g. Pizza Night"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Amount (रु)</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-3 bg-surfaceSecondary border border-primary/5 rounded-xl outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Paid By</label>
                  <select
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    className="w-full px-4 py-3 bg-surfaceSecondary border border-primary/5 rounded-xl outline-none"
                  >
                    {group.members.map(m => (
                      <option key={m.userId} value={m.userId}>{m.user.name} (You)</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Split Type</label>
                  <select
                    value={splitType}
                    onChange={(e) => setSplitType(e.target.value)}
                    className="w-full px-4 py-3 bg-surfaceSecondary border border-primary/5 rounded-xl outline-none"
                  >
                    <option value="equal">Equally</option>
                    <option value="custom">Custom Amounts</option>
                    <option value="percentage">Percentages</option>
                  </select>
                </div>
              </div>

              {splitType !== 'equal' && (
                <div className="space-y-4 pt-4 border-t border-slate-100">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Split Details</h3>
                  <div className="space-y-3">
                    {group.members.map((m) => (
                      <div key={m.userId} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold">{m.user.name.substring(0, 2).toUpperCase()}</div>
                          <span className="text-sm font-semibold">{m.user.name}</span>
                        </div>
                        <div className="relative w-32">
                          <input
                            type="number"
                            value={customSplits[m.userId] || ''}
                            onChange={(e) => setCustomSplits({...customSplits, [m.userId]: e.target.value})}
                            className="w-full pl-8 pr-4 py-2 bg-surfaceSecondary border border-primary/5 rounded-lg text-sm"
                            placeholder="0"
                          />
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                            {splitType === 'custom' ? 'रु' : '%'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </form>
            
            <div className="p-8 border-t border-slate-100 bg-surface flex gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-outline">Cancel</button>
              <button type="button" onClick={handleAddExpense} className="flex-1 btn-primary">Add Expense</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupDetail;
