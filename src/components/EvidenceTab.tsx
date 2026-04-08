"use client";

import { Info } from "lucide-react";

export default function EvidenceTab({ data, selectedFramework }: { data: any, selectedFramework?: string }) {
  const { logs = [], evidence = [] } = data;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">System Evidence</h2>
          <p className="text-slate-400 mt-2">Immutable records and simulation logs feeding the engine.</p>
        </div>
        <button className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-medium rounded-lg transition-colors flex items-center justify-center shadow-[0_0_15px_rgba(2,132,199,0.5)]">
          Simulate Activity
        </button>
      </header>

      <div className="border border-alert bg-sky-900/10 rounded-xl p-4 flex gap-4 text-sky-400 border-sky-500/20">
        <Info className="shrink-0" />
        <p className="text-sm">The timeline displays all state modifications and identity events. Actions blocked by the Enforcement Engine are recorded here to prove active defense.</p>
      </div>

      <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[1.2rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-slate-800">
        {logs.map((log: any, i: number) => (
          <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group border-transparent">
            
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-slate-950 bg-slate-800 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
              <div className={`w-3 h-3 rounded-full ${log.decision === 'Allow' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-red-500 shadow-[0_0_10px_#ef4444]'}`}></div>
            </div>
            
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] border border-slate-800 bg-slate-900/40 backdrop-blur rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sky-400">{log.action}</span>
                <span className="text-xs text-slate-500 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</span>
              </div>
              <p className="text-sm text-slate-300 mb-3">Actor: <span className="text-slate-100 font-medium">{log.actor}</span></p>
              
              <div className="bg-slate-950 rounded border border-slate-800 p-3 mt-4 overflow-x-auto">
                <pre className="text-xs text-slate-400 font-mono">
                  {JSON.stringify(log.metadata, null, 2)}
                </pre>
              </div>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
}
