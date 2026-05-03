import React, { useEffect, useState } from 'react';
import { Search, UserPlus, UserCheck, Clock, UserX } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { toast } from 'sonner';

const Connections = () => {
  const [connections, setConnections] = useState([]);
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuthStore();

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchConnections = async () => {
    try {
      const res = await api.get('/connections');
      setConnections(res.data);
    } catch (err) {
      toast.error('Failed to load connections');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchEmail) return;
    try {
      const res = await api.get(`/users/search?email=${searchEmail}`);
      setSearchResults(res.data.filter(u => u.id !== user.id));
    } catch (err) {
      toast.error('Search failed');
    }
  };

  const sendRequest = async (email) => {
    try {
      await api.post('/connections/request', { email });
      toast.success('Request sent!');
      setSearchResults([]);
      setSearchEmail('');
      fetchConnections();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send request');
    }
  };

  const respondToRequest = async (id, status) => {
    try {
      await api.post('/connections/respond', { id, status });
      toast.success(`Request ${status}!`);
      fetchConnections();
    } catch (err) {
      toast.error('Action failed');
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-primary font-bold">Loading...</div>;

  const pendingRequests = connections.filter(c => c.status === 'pending' && c.receiverId === user.id);
  const sentRequests = connections.filter(c => c.status === 'pending' && c.requesterId === user.id);
  const friends = connections.filter(c => c.status === 'accepted');

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-4xl font-display font-bold text-slate-900">Connections</h1>
        <p className="text-slate-500 text-lg">Connect with friends to start splitting expenses.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Search & Add */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bento-card bg-primary text-white">
            <h2 className="text-xl font-display font-bold mb-4">Find Friends</h2>
            <form onSubmit={handleSearch} className="relative">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Search by email..."
                className="w-full bg-white/10 border border-white/20 rounded-xl py-3 pl-4 pr-12 text-white placeholder-white/50 outline-none focus:bg-white/20"
              />
              <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-white/10 rounded-lg">
                <Search size={20} />
              </button>
            </form>
            
            {searchResults.length > 0 && (
              <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2">
                {searchResults.map(u => (
                  <div key={u.id} className="flex items-center justify-between p-3 bg-white/10 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">{u.name.substring(0, 2).toUpperCase()}</div>
                      <span className="text-sm font-medium">{u.name}</span>
                    </div>
                    <button onClick={() => sendRequest(u.email)} className="p-2 hover:bg-white/20 rounded-lg text-accent">
                      <UserPlus size={18} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Sent */}
          {sentRequests.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sent Requests</h3>
              <div className="space-y-2">
                {sentRequests.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-primary/5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">{c.receiver.name.substring(0, 2).toUpperCase()}</div>
                      <span className="font-bold text-slate-700">{c.receiver.name}</span>
                    </div>
                    <div className="text-slate-400"><Clock size={18} /></div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Connections List */}
        <div className="lg:col-span-2 space-y-8">
          {/* Pending Received */}
          {pendingRequests.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                <Clock className="text-accent" />
                Pending Requests
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingRequests.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-6 bg-white border border-accent/20 rounded-2xl shadow-sm shadow-accent/5">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center text-accent font-bold">{c.requester.name.substring(0, 2).toUpperCase()}</div>
                      <div>
                        <h4 className="font-bold text-slate-900">{c.requester.name}</h4>
                        <p className="text-xs text-slate-400">{c.requester.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => respondToRequest(c.id, 'accepted')} className="p-2 bg-accent/10 text-accent hover:bg-accent hover:text-white rounded-xl transition-all">
                        <UserCheck size={20} />
                      </button>
                      <button onClick={() => respondToRequest(c.id, 'declined')} className="p-2 bg-negative/10 text-negative hover:bg-negative hover:text-white rounded-xl transition-all">
                        <UserX size={20} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Friends List */}
          <section className="space-y-4">
            <h2 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="text-primary" />
              Friends
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {friends.length === 0 ? (
                <div className="md:col-span-2 p-12 text-center bg-white border border-dashed border-primary/20 rounded-3xl">
                  <p className="text-slate-400">No friends yet. Add them by email!</p>
                </div>
              ) : (
                friends.map(c => {
                  const friend = c.requesterId === user.id ? c.receiver : c.requester;
                  return (
                    <div key={c.id} className="flex items-center justify-between p-6 bg-white border border-primary/5 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-surfaceSecondary flex items-center justify-center text-primary font-bold">
                          {friend.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{friend.name}</h4>
                          <p className="text-xs text-slate-400">{friend.email}</p>
                        </div>
                      </div>
                      <div className="text-slate-300">
                        <ArrowRight size={20} />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default Connections;
