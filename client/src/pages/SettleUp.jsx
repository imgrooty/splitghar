import React, { useEffect, useState } from 'react';
import { Wallet, Smartphone, CreditCard, Gift, CheckCircle2, ArrowRight } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

const SettleUp = () => {
  const { user } = useAuthStore();
  const [debts, setDebts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDebt, setSelectedDebt] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [settledData, setSettledData] = useState(null);

  useEffect(() => {
    fetchDebts();
  }, []);

  const fetchDebts = async () => {
    try {
      const res = await api.get('/groups');
      const allDebts = [];
      
      // Fetch details for each group to get simplified debts
      for (const g of res.data) {
        const detailRes = await api.get(`/groups/${g.id}`);
        const userDebts = detailRes.data.simplifiedDebts.filter(d => d.from === user.id);
        userDebts.forEach(d => {
          allDebts.push({
            ...d,
            groupName: g.name,
            groupId: g.id,
            toUser: detailRes.data.members.find(m => m.userId === d.to)?.user
          });
        });
      }
      setDebts(allDebts);
    } catch (err) {
      toast.error('Failed to load debts');
    } finally {
      setLoading(false);
    }
  };

  const handleSettle = async () => {
    if (!selectedDebt) return;
    try {
      await api.post('/settlements', {
        fromUser: selectedDebt.from,
        toUser: selectedDebt.to,
        groupId: selectedDebt.groupId,
        amount: selectedDebt.amount,
        method: paymentMethod
      });
      
      let mockVoucher = null;
      if (paymentMethod === 'gift_card') {
        const brands = ['Amazon', 'Netflix', 'Swiggy', 'Starbucks'];
        const randomBrand = brands[Math.floor(Math.random() * brands.length)];
        mockVoucher = {
          brand: randomBrand,
          code: Math.random().toString(36).substring(2, 12).toUpperCase(),
          expiry: 'Dec 2026'
        };
      }

      setSettledData({ ...selectedDebt, mockVoucher });
      toast.success('Settlement completed successfully!');
      fetchDebts();
    } catch (err) {
      toast.error('Settlement failed');
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-primary font-bold">Loading...</div>;

  if (settledData) {
    return (
      <div className="max-w-2xl mx-auto py-12 animate-in zoom-in-95 duration-500">
        <div className="bg-white rounded-3xl p-12 text-center border border-primary/5 shadow-xl">
          <div className="h-20 w-20 bg-positive/10 text-positive rounded-full flex items-center justify-center mx-auto mb-8">
            <CheckCircle2 size={48} />
          </div>
          <h1 className="text-4xl font-display font-bold text-slate-900 mb-4">Settled Up!</h1>
          <p className="text-slate-500 text-lg mb-8">
            You've successfully paid रु {settledData.amount.toFixed(2)} to {settledData.toUser.name}.
          </p>

          {settledData.mockVoucher && (
            <div className="bg-primary text-white p-8 rounded-2xl mb-8 relative overflow-hidden text-left">
              <div className="absolute right-[-20px] top-[-20px] opacity-10 rotate-12">
                <Gift size={120} />
              </div>
              <div className="relative z-10">
                <span className="text-xs font-bold uppercase tracking-widest opacity-60">Digital Gift Card</span>
                <h3 className="text-2xl font-display font-bold mt-1 mb-4">{settledData.mockVoucher.brand}</h3>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-4 rounded-xl flex justify-between items-center mb-4">
                  <span className="font-mono text-xl tracking-wider">{settledData.mockVoucher.code}</span>
                  <button className="text-xs font-bold bg-white text-primary px-3 py-1 rounded-lg">COPY</button>
                </div>
                <p className="text-xs opacity-60">Expires: {settledData.mockVoucher.expiry} • Valid across all outlets.</p>
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button onClick={() => setSettledData(null)} className="flex-1 btn-outline">Back to Settle Up</button>
            <button onClick={() => window.location.href = '/'} className="flex-1 btn-primary">Go to Dashboard</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-display font-bold text-slate-900">Settle Up</h1>
        <p className="text-slate-500 text-lg">Choose a debt to clear and your preferred payment method.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Debts List */}
        <div className="space-y-6">
          <h2 className="text-2xl font-display font-bold text-slate-900">Pending Debts</h2>
          <div className="space-y-4">
            {debts.length === 0 ? (
              <div className="p-12 text-center bg-white border border-dashed border-primary/20 rounded-3xl">
                <p className="text-slate-400">No pending debts. You're all clear!</p>
              </div>
            ) : (
              debts.map((debt, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedDebt(debt)}
                  className={`w-full text-left p-6 rounded-2xl border transition-all ${
                    selectedDebt === debt
                      ? 'bg-primary/5 border-primary shadow-sm'
                      : 'bg-white border-primary/5 hover:border-primary/20'
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                        {debt.toUser.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900">Pay {debt.toUser.name}</h4>
                        <p className="text-xs text-slate-400">{debt.groupName}</p>
                      </div>
                    </div>
                    <div className="text-xl font-display font-bold text-negative">
                      रु {debt.amount.toFixed(2)}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Payment & Action */}
        <div className="space-y-8">
          <h2 className="text-2xl font-display font-bold text-slate-900">Payment Method</h2>
          
          <div className="grid grid-cols-1 gap-3">
            <button
              onClick={() => setPaymentMethod('upi')}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                paymentMethod === 'upi' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white border-primary/5 hover:bg-slate-50'
              }`}
            >
              <Smartphone size={24} />
              <div className="text-left">
                <p className="font-bold">UPI Payment</p>
                <p className={`text-xs ${paymentMethod === 'upi' ? 'text-white/60' : 'text-slate-400'}`}>Pay via PhonePe, GPay, or Paytm</p>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('wallet')}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                paymentMethod === 'wallet' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white border-primary/5 hover:bg-slate-50'
              }`}
            >
              <Wallet size={24} />
              <div className="text-left">
                <p className="font-bold">Digital Wallet</p>
                <p className={`text-xs ${paymentMethod === 'wallet' ? 'text-white/60' : 'text-slate-400'}`}>Use your Sg wallet balance</p>
              </div>
            </button>

            <button
              onClick={() => setPaymentMethod('gift_card')}
              className={`flex items-center gap-4 p-5 rounded-2xl border transition-all ${
                paymentMethod === 'gift_card' ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-white border-primary/5 hover:bg-slate-50'
              }`}
            >
              <Gift size={24} />
              <div className="text-left">
                <p className="font-bold">Gift Card Settlement</p>
                <p className={`text-xs ${paymentMethod === 'gift_card' ? 'text-white/60' : 'text-slate-400'}`}>Settle via Amazon/Swiggy Vouchers</p>
              </div>
            </button>
          </div>

          <div className="p-8 bg-surfaceSecondary rounded-3xl border border-primary/5">
            <div className="flex justify-between items-center mb-6">
              <span className="text-slate-500 font-medium">Settlement Amount</span>
              <span className="text-2xl font-display font-bold text-slate-900">
                रु {selectedDebt ? selectedDebt.amount.toFixed(2) : '0.00'}
              </span>
            </div>
            <button
              disabled={!selectedDebt}
              onClick={handleSettle}
              className="w-full btn-primary py-4 flex items-center justify-center gap-2 group disabled:opacity-30"
            >
              Confirm Settlement
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
            {!selectedDebt && (
              <p className="text-center text-xs text-slate-400 mt-4 italic">Please select a debt from the list first.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettleUp;
