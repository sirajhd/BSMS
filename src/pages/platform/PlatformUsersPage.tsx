import React, { useEffect, useState } from 'react';
import { platformApi } from '../../api/platform.api';
import type { User } from '../../types';
import { Search, Building2 } from 'lucide-react';

export const PlatformUsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await platformApi.getUsers();
        setUsers(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">Platform Users Explorer</h1>
        <p className="text-sm text-slate-400">
          Directory of all registered platform administrators, shop owners, managers, barbers, and customers.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search users by email or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/60"
          />
        </div>
      </div>

      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden backdrop-blur-xl shadow-xl">
        {isLoading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">No users found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Platform Role</th>
                  <th className="px-6 py-4">Shop Memberships</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-sm">
                {filtered.map((u: any) => (
                  <tr key={u.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-xs font-bold text-amber-400 border border-slate-700">
                          {u.email.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-200">{u.email}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                          u.role === 'SUPER_ADMIN'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : u.role === 'SHOP_OWNER'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {u.memberships && u.memberships.length > 0 ? (
                          u.memberships.map((m: any) => (
                            <span
                              key={m.id}
                              className="inline-flex items-center space-x-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-slate-300"
                            >
                              <Building2 className="w-3 h-3 text-amber-400" />
                              <span>{m.tenant?.name || 'Shop'} ({m.role})</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-500">None (Platform user)</span>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                          u.isActive
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : 'text-red-400 bg-red-500/10'
                        }`}
                      >
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-xs text-slate-400 font-mono">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
