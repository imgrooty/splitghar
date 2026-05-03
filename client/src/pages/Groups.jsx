import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Users, Search, MoreVertical } from 'lucide-react';
import api from '../services/api';
import { toast } from 'sonner';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    fetchGroups();
    fetchConnections();
  }, []);

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      setGroups(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConnections = async () => {
    try {
      const res = await api.get('/connections');
      const accepted = res.data.filter(c => c.status === 'accepted');
      setConnections(accepted);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName) return toast.error('Group name is required');
    try {
      await api.post('/groups', { name: newGroupName, memberIds: selectedMembers });
      toast.success('Group created!');
      setIsModalOpen(false);
      setNewGroupName('');
      setSelectedMembers([]);
      fetchGroups();
    } catch (err) {
      toast.error('Failed to create group');
    }
  };

  const toggleMember = (id) => {
    if (selectedMembers.includes(id)) {
      setSelectedMembers(selectedMembers.filter(m => m !== id));
    } else {
      setSelectedMembers([...selectedMembers, id]);
    }
  };

  if (loading) return <div className="flex justify-center py-20 text-primary font-bold">Loading...</div>;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-display font-bold text-slate-900">Your Groups</h1>
          <p className="text-slate-500">Manage and split expenses with your squads.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="btn-primary py-3 flex items-center gap-2">
          <Plus size={20} />
          Create Group
        </button>
      </header>

      {groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-primary/20">
          <img
            src="https://images.unsplash.com/photo-1753351055582-67172f8c4d27?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDN8MHwxfHNlYXJjaHwyfHxmcmllbmRzJTIwY2FmZSUyMGRpbm5lcnxlbnwwfHx8fDE3NzcyMTE4NzB8MA&ixlib=rb-4.1.0&q=85"
            alt="No groups"
            className="w-64 h-64 object-cover rounded-2xl mb-6 grayscale opacity-50"
          />
          <h3 className="text-xl font-bold text-slate-900">No groups yet</h3>
          <p className="text-slate-500 mb-6 text-center max-w-xs">Create a group and start splitting pizza bills or travel costs.</p>
          <button onClick={() => setIsModalOpen(true)} className="btn-primary">Create your first group</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <Link
              key={group.id}
              to={`/groups/${group.id}`}
              className="bento-card group hover:scale-[1.02] transition-all"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center text-xl font-bold shadow-lg shadow-primary/20">
                  {group.name.substring(0, 2).toUpperCase()}
                </div>
                <button className="text-slate-400 hover:text-slate-900 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
              <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">{group.name}</h3>
              <div className="flex -space-x-2 mb-6">
                {group.members.slice(0, 4).map((m, idx) => (
                  <div key={idx} className="h-8 w-8 rounded-full bg-surfaceSecondary border-2 border-white flex items-center justify-center text-xs font-bold text-primary">
                    {m.user.name.substring(0, 2).toUpperCase()}
                  </div>
                ))}
                {group.members.length > 4 && (
                  <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-500">
                    +{group.members.length - 4}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-primary/5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Net Balance</span>
                <span className="font-bold text-primary">Check Details</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Group Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-primary/20 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100">
              <h2 className="text-2xl font-display font-bold text-slate-900">Create New Group</h2>
              <p className="text-slate-500">Name your group and add friends.</p>
            </div>
            <form onSubmit={handleCreateGroup} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Group Name</label>
                <input
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-4 py-3 bg-surfaceSecondary border border-primary/5 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  placeholder="e.g. Goa Trip 2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Add Members</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {connections.map((c) => {
                    const friend = c.requesterId === api.userId ? c.receiver : c.requester;
                    // Note: need to handle friend object correctly based on auth store
                    return (
                      <label key={c.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-surfaceSecondary cursor-pointer transition-colors border border-transparent has-[:checked]:border-primary/20 has-[:checked]:bg-primary/5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {friend.name.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="font-semibold text-slate-700">{friend.name}</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(friend.id)}
                          onChange={() => toggleMember(friend.id)}
                          className="w-5 h-5 accent-primary"
                        />
                      </label>
                    );
                  })}
                  {connections.length === 0 && (
                    <p className="text-sm text-slate-400 py-4 text-center">No friends connected yet.</p>
                  )}
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-outline">Cancel</button>
                <button type="submit" className="flex-1 btn-primary">Create Group</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;
