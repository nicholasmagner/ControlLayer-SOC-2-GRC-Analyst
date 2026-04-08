"use client";

import { useState } from "react";
import { Cloud, Server, Database, Plug, RefreshCw } from "lucide-react";

export default function ConnectorsTab() {
  const [isSyncingAws, setIsSyncingAws] = useState(false);
  const [awsStatus, setAwsStatus] = useState("Disconnected");

  const connectors = [
    { id: 'aws', name: 'AWS CloudTrail', status: awsStatus, type: 'cloud', icon: Cloud },
    { id: 'azure', name: 'Azure Activity Logs', status: 'Disconnected', type: 'cloud', icon: Cloud },
    { id: 'onprem', name: 'Active Directory (On-Prem)', status: 'Connected', type: 'server', icon: Server },
    { id: 'db', name: 'PostgreSQL Telemetry', status: 'Connected', type: 'db', icon: Database },
  ];

  const handleConnect = async (id: string) => {
    if (id === 'aws') {
      setIsSyncingAws(true);
      setAwsStatus("Syncing...");
      try {
        const res = await fetch('/api/connectors/aws/sync', { method: 'POST' });
        const data = await res.json();
        if (data.success) {
          setAwsStatus("Connected");
        } else {
          setAwsStatus("Error");
          alert(data.error || "Failed to sync with AWS.");
        }
      } catch (err) {
        setAwsStatus("Error");
        alert("Failed to connect to backend sync service.");
      } finally {
        setIsSyncingAws(false);
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h2 className="text-3xl font-bold tracking-tight">Integration Connectors</h2>
        <p className="text-slate-400 mt-2">Manage optional cloud and on-premise data sources.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {connectors.map(c => {
          const Icon = c.icon;
          const isConnected = c.status === 'Connected';
          
          return (
            <div key={c.id} className="border border-slate-800 bg-slate-900/50 hover:bg-slate-900 transition-colors rounded-xl p-6 group">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-xl ${isConnected ? 'bg-sky-500/20 text-sky-400' : 'bg-slate-800 text-slate-400'}`}>
                  <Icon size={24} />
                </div>
                <div className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                  {c.status}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-200">{c.name}</h3>
              <p className="text-slate-500 text-sm mt-2 mb-6 h-10">
                {c.id === 'aws' || c.id === 'azure' ? 'Optional cloud connector plugin. Read-only API ingestion.' : 'Native integration data source.'}
              </p>
              
              <button 
                onClick={() => handleConnect(c.id)}
                disabled={isSyncingAws && c.id === 'aws'}
                className={`w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                  isConnected 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' 
                    : isSyncingAws && c.id === 'aws'
                    ? 'bg-sky-500/50 text-white cursor-not-allowed'
                    : 'bg-sky-600 hover:bg-sky-500 text-white'
                }`}
              >
                {isSyncingAws && c.id === 'aws' ? <RefreshCw size={16} className="animate-spin" /> : <Plug size={16} />}
                {isSyncingAws && c.id === 'aws' ? 'Syncing...' : isConnected ? 'Configure' : 'Connect'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
