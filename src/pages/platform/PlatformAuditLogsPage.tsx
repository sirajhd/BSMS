import React, { useEffect, useState } from 'react';
import { platformApi } from '../../api/platform.api';
import type { AuditLog } from '../../types';
import { Search, Building2, User } from 'lucide-react';

export const PlatformAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await platformApi.getAuditLogs();
        setLogs(data);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, []);

  const filtered = logs.filter((l) => {
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.entity.toLowerCase().includes(q) ||
      l.actorUser?.email.toLowerCase().includes(q) ||
      l.tenant?.name.toLowerCase().includes(q) ||
      l.tenant?.slug.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-100">Global Audit Trail</h1>
        <p className="text-sm text-slate-400">
          Immutable event ledger recording all platform actions, tenant lifecycle modifications, and security events.
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl flex items-center">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by action, entity, user, shop..."
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
          <div className="p-12 text-center text-slate-500 text-sm">No audit logs found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-slate-800 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-950/40">
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Tenant</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Metadata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filtered.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 text-slate-400 font-mono">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono font-bold">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 font-medium">
                      {log.entity} {log.entityId ? `(#${log.entityId.slice(0, 8)})` : ''}
                    </td>
                    <td className="px-4 py-3">
                      {log.tenant ? (
                        <span className="text-slate-300 flex items-center space-x-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>{log.tenant.name}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Platform Global</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {log.actorUser ? (
                        <span className="text-slate-300 flex items-center space-x-1">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{log.actorUser.email}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                      {log.metadata || '—'}
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
