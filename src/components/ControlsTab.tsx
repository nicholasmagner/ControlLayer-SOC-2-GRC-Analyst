"use client";

import { CheckCircle2, AlertCircle, HelpCircle } from "lucide-react";

export default function ControlsTab({ data, selectedFramework }: { data: any, selectedFramework?: string }) {
  const { scores = [], controls = [] } = data;

  let displayControls = controls;
  if (selectedFramework && selectedFramework !== "All Frameworks") {
    displayControls = controls.filter((c: any) => c.framework === selectedFramework);
  }

  const latestScores = new Map();
  scores.forEach((s: any) => {
    if (!latestScores.has(s.controlId)) latestScores.set(s.controlId, s);
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Active Controls</h2>
        <p className="text-slate-400 mt-2">Mappings of enforcement policies to frameworks.</p>
      </header>

      <div className="grid grid-cols-1 gap-4">
        {displayControls.map((control: any) => {
          const score = latestScores.get(control.id);
          const status = score ? score.status : "Unknown";
          const justification = score ? score.justification : "No assessment data available.";
          
          let StatusIcon = HelpCircle;
          let statusColor = "text-slate-400";
          let badgeColor = "bg-slate-500/10 text-slate-400 border-slate-500/20";

          if (status === 'Met') {
            StatusIcon = CheckCircle2;
            statusColor = "text-emerald-500";
            badgeColor = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
          } else if (status === 'Not Met') {
            StatusIcon = AlertCircle;
            statusColor = "text-red-500";
            badgeColor = "bg-red-500/10 text-red-400 border-red-500/20";
          } else if (status === 'Partially Met') {
            StatusIcon = AlertCircle;
            statusColor = "text-amber-500";
            badgeColor = "bg-amber-500/10 text-amber-400 border-amber-500/20";
          }

          return (
            <div key={control.id} className="border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors backdrop-blur-xl rounded-xl p-6 flex flex-col md:flex-row md:items-start justify-between gap-6 group">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-400 tracking-wider">
                    {control.framework}
                  </span>
                  <h3 className="text-xl font-semibold">{control.controlId}</h3>
                </div>
                <h4 className="text-slate-200 font-medium mb-3">{control.name}</h4>
                <p className="text-slate-400 text-sm">{control.description}</p>
              </div>

              <div className="md:w-1/3 flex flex-col items-start md:items-end gap-3 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-6">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold tracking-wide ${badgeColor}`}>
                  <StatusIcon size={16} />
                  <span>{status}</span>
                </div>
                <p className="text-xs text-slate-500 md:text-right mt-1">
                  {justification}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
