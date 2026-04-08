"use client";

import { useState } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";

export default function AIAssistantTab({ data, selectedFramework }: { data: any, selectedFramework?: string }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I am the ControlLayer AI Assistant. I can help analyze your compliance posture, explain control failures, and suggest remediation steps. Note: I operate in an assistive capacity only and do not have execution authority.' }
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    
    // Optimistic add
    const newMessages = [...messages, { role: 'user', content: input }];
    setMessages(newMessages);
    setInput('');
    
    // Simulate AI response
    setTimeout(() => {
      setMessages([...newMessages, { 
        role: 'assistant', 
        content: 'Based on your system data, the requested control is currently under evaluation. Since I operate offline by default, I am returning a simulated analysis: Ensure that privilege escalation routes are restricted and refer to the Control Dashboard for failure logs.' 
      }]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-6">
        <h2 className="text-3xl font-bold tracking-tight">AI Assessment Assistant</h2>
        <p className="text-slate-400 mt-2">Interact with system telemetry and compliance data for guidance.</p>
      </header>

      <div className="flex-1 flex flex-col border border-slate-800 bg-slate-900/30 rounded-2xl overflow-hidden backdrop-blur-xl">
        <div className="bg-slate-900/80 border-b border-slate-800 p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-sky-500/20 flex items-center justify-center text-sky-400 border border-sky-500/30">
            <Bot size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">Guardrails Active</h3>
            <p className="text-xs text-slate-400">Read-only mode. Deterministic evaluation takes priority.</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex gap-4 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-700 text-slate-300' : 'bg-sky-600 text-white'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Sparkles size={16} />}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-sky-600 text-white rounded-tr-sm' 
                    : 'bg-slate-800/80 border border-slate-700 text-slate-200 rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-slate-900/80 border-t border-slate-800">
          <div className="relative flex items-center">
            <input 
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSend()}
              placeholder="Ask about compliance failures or request SSP generation..."
              className="w-full bg-slate-950 border border-slate-700 rounded-full py-3 pl-4 pr-12 outline-none focus:border-sky-500 transition-colors text-sm"
            />
            <button 
              onClick={handleSend}
              className="absolute right-2 p-2 bg-sky-600 hover:bg-sky-500 rounded-full text-white transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
