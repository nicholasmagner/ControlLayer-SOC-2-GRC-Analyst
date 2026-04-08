"use client";

import { useState } from "react";
import { Shield, Target, AlertTriangle, AlertCircle, X } from "lucide-react";

export default function DashboardTab({ data, selectedFramework, onNavigate }: { data: any, selectedFramework?: string, onNavigate?: (tab: string) => void }) {
  const { scores = [], logs = [], findings = [] } = data;
  const [activePopup, setActivePopup] = useState<string | null>(null);

  const togglePopup = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setActivePopup(prev => prev === id ? null : id);
  };

  const closePopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActivePopup(null);
  };

  let displayScores = scores;
  if (selectedFramework && selectedFramework !== "All Frameworks") {
    displayScores = scores.filter((s: any) => s.control?.framework === selectedFramework);
  }

  const latestScores = new Map();
  displayScores.forEach((s: any) => {
    if (!latestScores.has(s.controlId)) latestScores.set(s.controlId, s);
  });
  
  const uniqueScores = Array.from(latestScores.values());
  const metControls = uniqueScores.filter((s: any) => s.status === 'Met');
  const partialControls = uniqueScores.filter((s: any) => s.status === 'Partially Met');
  const failedControls = uniqueScores.filter((s: any) => s.status === 'Not Met');
  const openFindings = findings.filter((f: any) => f.status === 'Open');
  
  const metCount = metControls.length;
  const partialCount = partialControls.length;
  const notMetCount = failedControls.length;
  const totalCount = uniqueScores.length || 1;
  const compliancePercentage = Math.round((metCount / totalCount) * 100);

  const determineRingColor = (pct: number) => {
    if (pct >= 90) return "text-emerald-500";
    if (pct >= 70) return "text-sky-500";
    if (pct >= 50) return "text-amber-500";
    return "text-red-500";
  };
  
  const ringColor = determineRingColor(compliancePercentage);

  return (
    <div 
      className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 ease-out"
      onClick={() => setActivePopup(null)}
    >
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Compliance Posture</h2>
        <p className="text-slate-400 mt-2">
          Real-time assessment of your environment across {selectedFramework === "All Frameworks" ? "all frameworks" : selectedFramework}.
        </p>
      </header>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="col-span-1 lg:col-span-1 border border-slate-800 bg-slate-900/50 backdrop-blur-xl rounded-2xl p-8 flex flex-col items-center justify-center relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <h3 className="text-lg font-semibold text-slate-300 mb-6 w-full text-center">Score</h3>
          
          <div className="relative flex items-center justify-center">
            <svg className="w-48 h-48 transform -rotate-90">
              <circle cx="96" cy="96" r="88" className="stroke-slate-800" strokeWidth="12" fill="none" />
              <circle 
                cx="96" 
                cy="96" 
                r="88" 
                className={`stroke-current ${ringColor} transition-all duration-1000 ease-out`} 
                strokeWidth="12" 
                fill="none" 
                strokeDasharray="553" 
                strokeDashoffset={553 - (553 * compliancePercentage) / 100} 
                strokeLinecap="round" 
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-5xl font-extrabold tracking-tighter">{compliancePercentage}%</span>
              <span className="text-sm font-medium text-slate-400 mt-1 uppercase tracking-widest">Compliant</span>
            </div>
          </div>
        </div>
        
        <div className="col-span-1 lg:col-span-2 grid grid-cols-2 gap-6 relative z-20">
            <div 
              onClick={(e) => togglePopup(e, 'met')}
              className={`bg-slate-900/50 hover:bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col justify-between relative transition-all duration-200 cursor-pointer ${activePopup === 'met' ? 'z-50 ring-1 ring-emerald-500 border-transparent shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'z-10'}`}
             >
              <div className="flex items-center justify-between pointer-events-none">
                <Shield className="text-emerald-500" size={24} />
                <span className="text-2xl font-bold">{metCount}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-300 mt-4 uppercase tracking-wider pointer-events-none">Controls Met</h3>
              
              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-[80%] -left-4 mt-2 w-72 p-4 bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl transition-all duration-300 z-50 cursor-default ${activePopup === 'met' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Compliant Controls</h4>
                  <button 
                    onClick={closePopup}
                    className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-500 hover:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {metControls.length > 0 ? metControls.slice(0, 5).map((s: any) => (
                    <div 
                      key={s.id} 
                      onClick={(e) => { e.stopPropagation(); onNavigate?.('controls'); }}
                      className="text-sm leading-tight flex flex-col gap-1 cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg -mx-2 transition-colors"
                    >
                      <span className="font-semibold text-emerald-400">{s.control?.controlId || s.controlId}</span>
                      <span className="text-slate-400 text-xs line-clamp-1">{s.control?.name || ''}</span>
                    </div>
                  )) : <p className="text-xs text-slate-500">None</p>}
                  {metControls.length > 5 && <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-800 pt-2">+{metControls.length - 5} more mapped...</p>}
                </div>
              </div>
            </div>
            
            <div 
              onClick={(e) => togglePopup(e, 'partial')}
              className={`bg-slate-900/50 hover:bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col justify-between relative transition-all duration-200 cursor-pointer ${activePopup === 'partial' ? 'z-50 ring-1 ring-amber-500 border-transparent shadow-[0_0_20px_rgba(245,158,11,0.15)]' : 'z-10'}`}
             >
              <div className="flex items-center justify-between pointer-events-none">
                <Target className="text-amber-500" size={24} />
                <span className="text-2xl font-bold">{partialCount}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-300 mt-4 uppercase tracking-wider pointer-events-none">Partially Met</h3>

              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-[80%] -right-4 mt-2 w-72 p-4 bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl transition-all duration-300 z-50 cursor-default ${activePopup === 'partial' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Partial Controls</h4>
                  <button 
                    onClick={closePopup}
                    className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-500 hover:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {partialControls.length > 0 ? partialControls.slice(0, 5).map((s: any) => (
                    <div 
                      key={s.id} 
                      onClick={(e) => { e.stopPropagation(); onNavigate?.('controls'); }}
                      className="text-sm leading-tight flex flex-col gap-1 cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg -mx-2 transition-colors"
                    >
                      <span className="font-semibold text-amber-400">{s.control?.controlId || s.controlId}</span>
                      <span className="text-slate-400 text-xs line-clamp-1">{s.control?.name || ''}</span>
                    </div>
                  )) : <p className="text-xs text-slate-500">None</p>}
                  {partialControls.length > 5 && <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-800 pt-2">+{partialControls.length - 5} more mapped...</p>}
                </div>
              </div>
            </div>

            <div 
              onClick={(e) => togglePopup(e, 'failed')}
              className={`bg-slate-900/50 hover:bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col justify-between relative transition-all duration-200 cursor-pointer ${activePopup === 'failed' ? 'z-50 ring-1 ring-red-500 border-transparent shadow-[0_0_20px_rgba(239,68,68,0.15)]' : 'z-10'}`}
             >
              <div className="flex items-center justify-between pointer-events-none">
                <AlertCircle className="text-red-500" size={24} />
                <span className="text-2xl font-bold">{notMetCount}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-300 mt-4 uppercase tracking-wider pointer-events-none">Controls Failed</h3>

              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-[80%] -left-4 mt-2 w-72 p-4 bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl transition-all duration-300 z-50 cursor-default ${activePopup === 'failed' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Failed Controls</h4>
                  <button 
                    onClick={closePopup}
                    className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-500 hover:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {failedControls.length > 0 ? failedControls.slice(0, 5).map((s: any) => (
                    <div 
                      key={s.id} 
                      onClick={(e) => { e.stopPropagation(); onNavigate?.('controls'); }}
                      className="text-sm leading-tight flex flex-col gap-1 cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg -mx-2 transition-colors"
                    >
                      <span className="font-semibold text-red-500">{s.control?.controlId || s.controlId}</span>
                      <span className="text-slate-400 text-xs line-clamp-1">{s.control?.name || ''}</span>
                    </div>
                  )) : <p className="text-xs text-slate-500">None</p>}
                  {failedControls.length > 5 && <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-800 pt-2">+{failedControls.length - 5} more mapped...</p>}
                </div>
              </div>
            </div>

            <div 
              onClick={(e) => togglePopup(e, 'findings')}
              className={`bg-slate-900/50 hover:bg-slate-900/70 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 flex flex-col justify-between relative transition-all duration-200 cursor-pointer ${activePopup === 'findings' ? 'z-50 ring-1 ring-rose-500 border-transparent shadow-[0_0_20px_rgba(244,63,94,0.15)]' : 'z-10'}`}
             >
              <div className="flex items-center justify-between pointer-events-none">
                <AlertTriangle className="text-amber-500" size={24} />
                <span className="text-2xl font-bold">{openFindings.length}</span>
              </div>
              <h3 className="text-sm font-medium text-slate-300 mt-4 uppercase tracking-wider pointer-events-none">Active Findings</h3>

              <div 
                onClick={(e) => e.stopPropagation()}
                className={`absolute top-[80%] -right-4 mt-2 w-72 p-4 bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl transition-all duration-300 z-50 cursor-default ${activePopup === 'findings' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'}`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Open Findings</h4>
                  <button 
                    onClick={closePopup}
                    className="p-1 hover:bg-slate-800 rounded-md transition-colors text-slate-500 hover:text-slate-300"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {openFindings.length > 0 ? openFindings.slice(0, 5).map((f: any) => (
                    <div 
                      key={f.id} 
                      onClick={(e) => { e.stopPropagation(); onNavigate?.('findings'); }}
                      className="text-sm border-l border-amber-500/50 pl-3 cursor-pointer hover:bg-slate-800/50 p-2 rounded-lg transition-colors my-1"
                    >
                      <div className="font-semibold text-slate-200 truncate">{f.title}</div>
                      <div className="text-xs text-slate-500 mt-1 flex items-center justify-between">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          f.severity === 'High' ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {f.severity}
                        </span>
                        <span className="truncate ml-2">{f.resource}</span>
                      </div>
                    </div>
                  )) : <p className="text-xs text-slate-500">None</p>}
                  {openFindings.length > 5 && <p className="text-xs text-slate-500 italic mt-2 border-t border-slate-800 pt-2">+{openFindings.length - 5} more issues...</p>}
                </div>
              </div>
            </div>
        </div>
      </div>
      
      <div className="border border-slate-800 bg-slate-900/50 backdrop-blur-xl rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-semibold">Recent Event Logs</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900 font-semibold tracking-wider">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Decision</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice(0, 5).map((log: any) => (
                <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 text-slate-300 font-mono text-xs">{new Date(log.timestamp).toLocaleString()}</td>
                  <td className="px-6 py-4 font-medium">{log.action}</td>
                  <td className="px-6 py-4 text-slate-400">{log.actor}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${log.decision === 'Allow' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {log.decision}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
