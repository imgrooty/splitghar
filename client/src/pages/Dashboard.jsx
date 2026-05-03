import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowUpRight, ArrowDownLeft, Users, Receipt } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const Dashboard = () => {
  const [stats, setStats] = useState({ youOwe: 0, youAreOwed: 0 });
  const [recentGroups, setRecentGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, groupsRes] = await Promise.all([
          api.get('/dashboard/stats'),
          api.get('/groups')
        ]);
        setStats(statsRes.data);
        setRecentGroups(groupsRes.data.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div className="flex justify-center py-20 text-primary font-bold">Loading...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-display font-bold text-slate-900">Hey, {user?.name.split(' ')[0]}!</h1>
          <p className="text-slate-500 text-lg">Here's what's happening with your expenses.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/groups" className="btn-primary py-3 flex items-center gap-2">
            <Plus size={20} />
            New Group
          </Link>
          <Link to="/connections" className="btn-outline py-3 flex items-center gap-2">
            <Users size={20} />
            Friends
          </Link>
        </div>
      </header>

      {/* Stats Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bento-card flex flex-col justify-between border-l-4 border-l-negative">
          <div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total You Owe</span>
            <div className="text-5xl font-display font-bold text-negative mt-2">
              रु {stats.youOwe.toFixed(2)}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-negative/80">
            <ArrowDownLeft size={18} />
            <span className="text-sm font-medium">Pending settlements</span>
          </div>
        </div>

        <div className="bento-card flex flex-col justify-between border-l-4 border-l-positive">
          <div>
            <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">You are Owed</span>
            <div className="text-5xl font-display font-bold text-positive mt-2">
              रु {stats.youAreOwed.toFixed(2)}
            </div>
          </div>
          <div className="mt-6 flex items-center gap-2 text-positive/80">
            <ArrowUpRight size={18} />
            <span className="text-sm font-medium">Coming your way</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Groups */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-display font-bold text-slate-900">Recent Groups</h2>
            <Link to="/groups" className="text-primary font-bold text-sm hover:underline">View All</Link>
          </div>
          
          <div className="space-y-3">
            {recentGroups.length > 0 ? (
              recentGroups.map((group) => (
                <Link
                  key={group.id}
                  to={`/groups/${group.id}`}
                  className="flex items-center justify-between p-4 bg-white border border-primary/5 rounded-2xl hover:border-primary/20 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-surfaceSecondary flex items-center justify-center text-primary font-bold">
                      {group.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900">{group.name}</h3>
                      <p className="text-sm text-slate-500">{group.members.length} members</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-slate-400">
                      <Receipt size={14} />
                      <span className="text-xs font-medium uppercase tracking-tighter">{group.expenses.length} expenses</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="p-8 text-center bg-white border border-dashed border-primary/20 rounded-2xl">
                <p className="text-slate-400">No groups yet. Start by creating one!</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <h2 className="text-2xl font-display font-bold text-slate-900">Quick Actions</h2>
          <div className="grid grid-cols-1 gap-3">
            <button className="flex items-center gap-4 p-4 bg-white border border-primary/5 rounded-2xl hover:border-primary/20 hover:bg-slate-50 transition-all text-left">
              <div className="h-10 w-10 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                <Receipt size={20} />
              </div>
              <span className="font-bold text-slate-700">Add Expense</span>
            </button>
            <Link to="/settle" className="flex items-center gap-4 p-4 bg-white border border-primary/5 rounded-2xl hover:border-primary/20 hover:bg-slate-50 transition-all text-left">
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Wallet size={20} />
              </div>
              <span className="font-bold text-slate-700">Settle Up</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
