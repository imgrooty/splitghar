import React, { useEffect, useState } from 'react';
import { Wallet, ArrowRight, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const Balances = () => {
  const { user } = useAuthStore();
  const [friendBalances, setFriendBalances] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAllBalances = async () => {
      try {
        const groupsRes = await api.get('/groups');
        const balanceMap = {};

        for (const g of groupsRes.data) {
          const detailRes = await api.get(`/groups/${g.id}`);
          detailRes.data.simplifiedDebts.forEach(d => {
            if (d.from === user.id) {
              // I owe someone
              const toUser = detailRes.data.members.find(m => m.userId === d.to)?.user;
              if (toUser) {
                balanceMap[toUser.id] = (balanceMap[toUser.id] || 0) - d.amount;
                balanceMap[toUser.id + '_info'] = toUser;
              }
            } else if (d.to === user.id) {
              // Someone owes me
              const fromUser = detailRes.data.members.find(m => m.userId === d.from)?.user;
              if (fromUser) {
                balanceMap[fromUser.id] = (balanceMap[fromUser.id] || 0) + d.amount;
                balanceMap[fromUser.id + '_info'] = fromUser;
              }
            }
          });
        }
        setFriendBalances(balanceMap);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllBalances();
  }, [user.id]);

  if (loading) return <div className="flex justify-center py-20 text-primary font-bold">Loading...</div>;

  const friendIds = Object.keys(friendBalances).filter(k => !k.endsWith('_info'));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-display font-bold text-slate-900">Friend Balances</h1>
        <p className="text-slate-500 text-lg">Net balances with all your friends across every group.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {friendIds.length === 0 ? (
          <div className="lg:col-span-3 p-12 text-center bg-white border border-dashed border-primary/20 rounded-3xl">
            <p className="text-slate-400">No balances to show. You're all square!</p>
          </div>
        ) : (
          friendIds.map((id) => {
            const balance = friendBalances[id];
            const friend = friendBalances[id + '_info'];
            const isOwed = balance > 0;

            return (
              <div key={id} className="bento-card flex flex-col justify-between">
                <div className="flex items-center gap-4 mb-6">
                  <div className="h-12 w-12 rounded-xl bg-surfaceSecondary flex items-center justify-center text-primary font-bold">
                    {friend.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{friend.name}</h3>
                    <p className="text-xs text-slate-400">{friend.email}</p>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    {isOwed ? 'Owes you' : 'You owe'}
                  </span>
                  <div className={`text-3xl font-display font-bold ${isOwed ? 'text-positive' : 'text-negative'}`}>
                    रु {Math.abs(balance).toFixed(2)}
                  </div>
                </div>

                <div className={`mt-6 flex items-center gap-2 text-sm font-bold ${isOwed ? 'text-positive' : 'text-negative'}`}>
                  {isOwed ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  <span>{isOwed ? 'Positive balance' : 'Needs settlement'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default Balances;
