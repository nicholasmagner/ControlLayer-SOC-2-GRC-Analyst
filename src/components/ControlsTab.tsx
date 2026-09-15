"use client";

import { useState } from "react";
import { CheckCircle2, AlertCircle, HelpCircle, Sparkles } from "lucide-react";

export default function ControlsTab({ data, selectedFramework }: { data: any, selectedFramework?: string }) {
  const { scores = [], controls = [] } = data;
  const [explanations, setExplanations] = useState<Record<string, { loading: boolean; text?: string }>>({});

  // Keyed by the row's unique `id`, not `controlId` - the seed data has
  // multiple rows sharing the same human-readable controlId, and keying by
  // that would make one "Explain" click populate every row that shares it.
  const explain = async (rowId: string, controlId: string) => {
    setExplanations(prev => ({ ...prev, [rowId]: { loading: true } }));
    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controlId }),
      });
      const body = await res.json();
      setExplanations(prev => ({
        ...prev,
        [rowId]: { loading: false, text: res.ok ? body.explanation : (body.error || 'Request failed.') },
      }));
    } catch {
      setExplanations(prev => ({ ...prev, [rowId]: { loading: false, text: 'Could not reach the AI provider just now.' } }));
    }
  };

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
          const explanation = explanations[control.id];

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
            <div key={control.id} className="border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors backdrop-blur-xl rounded-xl p-6 flex flex-col gap-4 group">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
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
                  {status !== 'Unknown' && (
                    <button
                      onClick={() => explain(control.id, control.controlId)}
                      disabled={explanation?.loading}
                      className="flex items-center gap-1.5 text-xs font-medium text-sky-400 hover:text-sky-300 disabled:opacity-50 transition-colors"
                    >
                      <Sparkles size={12} />
                      {explanation?.loading ? 'Asking AI Assistant...' : 'Explain with AI'}
                    </button>
                  )}
                </div>
              </div>

              {explanation?.text && (
                <div className="border-t border-slate-800 pt-4 text-sm text-slate-300 leading-relaxed bg-slate-950/50 rounded-lg p-4">
                  {explanation.text}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
