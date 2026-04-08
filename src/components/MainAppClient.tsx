"use client";

import { useState } from "react";
import { LayoutDashboard, CheckCircle, ShieldAlert, Cpu, Network, ChevronDown, ChevronRight, Layers, AlertTriangle } from "lucide-react";
import DashboardTab from "./DashboardTab";
import ControlsTab from "./ControlsTab";
import EvidenceTab from "./EvidenceTab";
import AIAssistantTab from "./AIAssistantTab";
import ConnectorsTab from "./ConnectorsTab";
import FindingsTab from "./FindingsTab";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "controls", label: "Controls", icon: CheckCircle },
  { id: "findings", label: "Findings", icon: AlertTriangle },
  { id: "evidence", label: "Evidence", icon: ShieldAlert },

  { id: "ai", label: "AI Assistant", icon: Cpu },
  { id: "connectors", label: "Connectors", icon: Network },
];

const frameworks = ["All Frameworks", "CMMC", "SOC2"];

export function MainAppClient({ initialData }: { initialData: any }) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedFramework, setSelectedFramework] = useState("All Frameworks");
  const [isFrameworkExpanded, setIsFrameworkExpanded] = useState(true);

  return (
    <div className="flex h-screen w-full bg-slate-950 text-slate-50">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-10 relative shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
        <div 
          className="p-6 cursor-pointer group"
          onClick={() => setActiveTab("dashboard")}
        >
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-sky-400 to-blue-600 bg-clip-text text-transparent drop-shadow-sm group-hover:from-sky-300 group-hover:to-blue-500 transition-all">
            ControlLayer
          </h1>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.2em] font-semibold group-hover:text-slate-300 transition-colors">Compliance Engine</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-6">
          <div className="mb-6">
            <button 
              onClick={() => setIsFrameworkExpanded(!isFrameworkExpanded)}
              className="w-full flex items-center justify-between px-4 py-2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Layers size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Framework</span>
              </div>
              {isFrameworkExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
            
            {isFrameworkExpanded && (
              <div className="mt-2 ml-4 pl-4 border-l border-slate-800 space-y-1">
                {frameworks.map(fw => (
                  <button
                    key={fw}
                    onClick={() => setSelectedFramework(fw)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selectedFramework === fw 
                        ? "bg-sky-500/10 text-sky-400 font-medium" 
                        : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    {fw}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="px-4 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">Views</div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 ease-out outline-none focus:ring-2 focus:ring-sky-500/50 ${
                  isActive 
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.15)]" 
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent"
                }`}
              >
                <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                <span className={`text-sm tracking-wide ${isActive ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
              </button>
            );
          })}
        </nav>
        
        <div className="p-4 m-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-500 text-center">
          <p>Deterministic Mode <span className="text-emerald-500 font-bold ml-1">ON</span></p>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 -z-10" />
        
        <div className="p-8 h-full max-w-7xl mx-auto">
          {activeTab === "dashboard" && <DashboardTab data={initialData} selectedFramework={selectedFramework} onNavigate={setActiveTab} />}
          {activeTab === "controls" && <ControlsTab data={initialData} selectedFramework={selectedFramework} />}
          {activeTab === "findings" && <FindingsTab findingsData={initialData.findings} />}
          {activeTab === "evidence" && <EvidenceTab data={initialData} selectedFramework={selectedFramework} />}
          {activeTab === "ai" && <AIAssistantTab data={initialData} selectedFramework={selectedFramework} />}
          {activeTab === "connectors" && <ConnectorsTab />}
        </div>
      </main>
    </div>
  );
}
