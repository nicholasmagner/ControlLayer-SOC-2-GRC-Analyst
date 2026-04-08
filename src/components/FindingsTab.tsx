"use client";

import { useState } from "react";
import { ShieldAlert, RefreshCw, AlertTriangle, AlertCircle, Info, ExternalLink, X, Terminal, FileCode2, Wrench, AlertOctagon, ShieldCheck, CheckCircle2 } from "lucide-react";

export default function FindingsTab({ findingsData }: { findingsData?: any[] }) {
  const [isScanning, setIsScanning] = useState(false);
  const [findings, setFindings] = useState(findingsData || []);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedFinding, setSelectedFinding] = useState<any | null>(null);

  // Remediation State
  const [isRemediating, setIsRemediating] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmPhrase, setConfirmPhrase] = useState("");
  const REQUIRED_PHRASE = "confirm auto-remediate";

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedFindingId, setVerifiedFindingId] = useState<string | null>(null);
  const [verificationError, setVerificationError] = useState("");

  const runScan = async () => {
    setIsScanning(true);
    setErrorMsg("");
    try {
      const res = await fetch('/api/scans/aws', { method: 'POST' });
      const data = await res.json();
      
      if (data.success) {
        // Refresh the page or fetch findings from a GET endpoint
        // Since we don't have a GET endpoint in this demo, we'll force a reload
        // In a real app, you'd fetch the updated findings array and setFindings()
        window.location.reload();
      } else {
        setErrorMsg(data.error || "Failed to run scan.");
      }
    } catch (err) {
      setErrorMsg("Error connecting to scanning service.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleRemediate = async () => {
    if (!selectedFinding) return;
    setIsRemediating(true);
    setErrorMsg("");
    
    try {
      const res = await fetch("/api/findings/remediate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId: selectedFinding.id })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to auto-remediate.");
      }
      
      // Update local state to reflect resolution
      setFindings((prev: any[]) => prev.map(f => 
        f.id === selectedFinding.id ? { ...f, status: 'Resolved' } : f
      ));
      setSelectedFinding({ ...selectedFinding, status: 'Resolved' });
      setShowConfirmModal(false);
      setConfirmPhrase("");
      setVerifiedFindingId(null);
      setVerificationError("");

    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Remediation encountered an error.");
    } finally {
      setIsRemediating(false);
    }
  };

  const handleVerifyFix = async () => {
    if (!selectedFinding) return;
    setIsVerifying(true);
    setVerificationError("");
    
    try {
      const res = await fetch("/api/findings/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ findingId: selectedFinding.id })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify.");
      }
      
      if (data.verified) {
        setVerifiedFindingId(selectedFinding.id);
      } else {
        // Verification failed - policy wasn't there
        setVerificationError(data.message || "Failed. The resource is still vulnerable.");
        // Revert local state to Open
        setFindings((prev: any[]) => prev.map(f => 
          f.id === selectedFinding.id ? { ...f, status: 'Open' } : f
        ));
        setSelectedFinding({ ...selectedFinding, status: 'Open' });
      }

    } catch (err: any) {
      console.error(err);
      setVerificationError(err.message || "Verification passed check failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const highCount = findings.filter(f => f.severity === 'High' && f.status === 'Open').length;
  const mediumCount = findings.filter(f => f.severity === 'Medium' && f.status === 'Open').length;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
      <header className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Security Findings</h2>
          <p className="text-slate-400 mt-2">Active misconfigurations and vulnerabilities detected across connected environments.</p>
        </div>
        <button 
          onClick={runScan}
          disabled={isScanning}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors focus:ring-2 focus:ring-rose-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isScanning ? <RefreshCw size={18} className="animate-spin" /> : <ShieldAlert size={18} />}
          {isScanning ? 'Scanning Environment...' : 'Run Deep Scan'}
        </button>
      </header>

      {errorMsg && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl flex items-center gap-3">
          <AlertCircle size={20} />
          <p className="text-sm font-medium">{errorMsg}</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertCircle size={64} className="text-rose-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">High Severity</p>
          <p className="text-4xl font-bold text-slate-50">{highCount}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <AlertTriangle size={64} className="text-amber-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">Medium Severity</p>
          <p className="text-4xl font-bold text-slate-50">{mediumCount}</p>
        </div>
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
             <Info size={64} className="text-sky-500" />
          </div>
          <p className="text-sm font-medium text-slate-400 mb-1">Total Active Findings</p>
          <p className="text-4xl font-bold text-slate-50">{findings.filter(f => f.status === 'Open').length}</p>
        </div>
      </div>

      <div className="flex-1 bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
        <div className="overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-slate-400 sticky top-0 box-shadow-sm border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">Finding</th>
                <th className="px-6 py-4 font-semibold">Severity</th>
                <th className="px-6 py-4 font-semibold">Resource</th>
                <th className="px-6 py-4 font-semibold">Discovered</th>
                <th className="px-6 py-4 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {findings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500">
                    No active findings detected. Run a scan to find issues.
                  </td>
                </tr>
              ) : (
                findings.map((finding, idx) => (
                  <tr 
                    key={idx} 
                    onClick={() => setSelectedFinding(finding)}
                    className="hover:bg-slate-800/50 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-200">{finding.title}</p>
                      <p className="text-xs text-slate-500 mt-1 max-w-md truncate">{finding.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        finding.severity === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                        finding.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                        'bg-slate-800 text-slate-400 border-slate-700'
                      }`}>
                        {finding.severity === 'High' ? <AlertCircle size={12} /> : 
                         finding.severity === 'Medium' ? <AlertTriangle size={12} /> : 
                         <Info size={12} />}
                        {finding.severity}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 group-hover:text-slate-300 text-slate-500 transition-colors">
                        <span className="font-mono text-xs">{finding.resource}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(finding.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors">
                        {finding.status}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Finding Side Panel */}
      {selectedFinding && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm transition-opacity">
          <div 
            className="w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between p-6 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
              <div className="pr-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    selectedFinding.severity === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 
                    selectedFinding.severity === 'Medium' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' : 
                    'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {selectedFinding.severity === 'High' ? <AlertCircle size={12} /> : 
                     selectedFinding.severity === 'Medium' ? <AlertTriangle size={12} /> : 
                     <Info size={12} />}
                    {selectedFinding.severity}
                  </span>
                  <span className="text-xs font-medium px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg border border-slate-700">
                    {selectedFinding.status}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-100">{selectedFinding.title}</h3>
                <p className="text-sm text-slate-400 mt-1 font-mono">{selectedFinding.resource}</p>
              </div>
              <button 
                onClick={() => setSelectedFinding(null)}
                className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              
              {/* Context */}
              <section>
                <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Info size={16} className="text-sky-400" />
                  Risk Context
                </h4>
                <div className="bg-slate-800/30 border border-slate-700/50 p-4 rounded-xl text-slate-300 text-sm leading-relaxed">
                  {selectedFinding.description}
                  <p className="mt-3 text-xs text-slate-500">First seen: {new Date(selectedFinding.createdAt).toLocaleString()}</p>
                </div>
              </section>

              {/* Remediation */}
              {selectedFinding.remediation && (
                <section>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <Terminal size={16} className="text-emerald-400" />
                    How to Fix (Remediation)
                  </h4>
                  <div className="bg-emerald-900/10 border border-emerald-500/20 p-5 rounded-xl">
                    <div className="text-emerald-50 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                      {selectedFinding.remediation}
                    </div>
                  
                    {/* Remediation Action */}
                    {selectedFinding.status === 'Open' && selectedFinding.title === "IAM User missing MFA" && (
                      <div className="mt-6 pt-4 border-t border-emerald-500/20 flex justify-end">
                        <button 
                          onClick={() => setShowConfirmModal(true)}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
                        >
                          <Wrench size={16} />
                          Auto-Remediate Issue
                        </button>
                      </div>
                    )}
                    {selectedFinding.status === 'Resolved' && (
                      <div className="mt-6 pt-4 border-t border-emerald-500/20 flex flex-col gap-3">
                        <div className="flex justify-end gap-3 items-center">
                          <span className="text-emerald-400 font-semibold text-sm flex items-center gap-2">
                            <Info size={16} /> Issue Resolved Locally
                          </span>
                          {verifiedFindingId === selectedFinding.id ? (
                            <span className="text-sky-400 font-bold text-sm flex items-center gap-2 bg-sky-500/10 px-3 py-1.5 rounded-lg border border-sky-400/20">
                              <CheckCircle2 size={16} /> Verified in AWS
                            </span>
                          ) : (
                            <button 
                              onClick={handleVerifyFix}
                              disabled={isVerifying}
                              className="bg-slate-800 hover:bg-slate-700 text-sky-400 border border-sky-500/30 px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors shadow-lg shadow-sky-500/10 disabled:opacity-50"
                            >
                              {isVerifying ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                              {isVerifying ? "Verifying..." : "Verify in AWS"}
                            </button>
                          )}
                        </div>
                        {verificationError && (
                          <div className="bg-rose-500/10 p-3 rounded-lg border border-rose-500/20 text-rose-400 text-xs font-semibold animate-in slide-in-from-top-2">
                            {verificationError}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Evidence Details */}
              {selectedFinding.details && (
                <section>
                  <h4 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                    <FileCode2 size={16} className="text-indigo-400" />
                    Raw Evidence Data
                  </h4>
                  <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                    <div className="bg-slate-900 px-4 py-2 text-xs font-mono text-slate-400 border-b border-slate-800 border-dashed flex justify-between">
                      <span>Payload Context</span>
                      <span>JSON</span>
                    </div>
                    <pre className="p-4 text-xs font-mono text-indigo-300 overflow-x-auto">
                      {JSON.stringify(selectedFinding.details, null, 2)}
                    </pre>
                  </div>
                </section>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Safety Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700/50 shadow-2xl rounded-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-rose-500/20 bg-rose-500/5 flex items-center gap-4">
              <div className="p-3 bg-rose-500/20 rounded-full text-rose-500">
                <AlertOctagon size={28} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-rose-500">Active Remediation</h3>
                <p className="text-sm text-rose-400/80 mt-1">This action will modify live infrastructure.</p>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-slate-300 text-sm leading-relaxed">
                You are about to execute an automated security fix. For this finding, the system will actively attach an IAM policy to <strong>{selectedFinding?.resource?.split('/').pop()}</strong> that <strong className="text-slate-100">denies all access</strong> until they sign in and configure an MFA device.
              </p>
              <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wide">
                  Type <span className="text-rose-400 font-mono select-none">{REQUIRED_PHRASE}</span> to proceed:
                </label>
                <input 
                  type="text" 
                  value={confirmPhrase}
                  onChange={(e) => setConfirmPhrase(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-slate-100 font-mono focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all placeholder:text-slate-600"
                  placeholder={REQUIRED_PHRASE}
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-800 bg-slate-900/50 flex justify-end gap-3">
              <button 
                onClick={() => { setShowConfirmModal(false); setConfirmPhrase(""); }}
                className="px-5 py-2.5 rounded-lg text-sm font-semibold text-slate-300 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                disabled={isRemediating}
              >
                Cancel
              </button>
              <button 
                onClick={handleRemediate}
                disabled={confirmPhrase !== REQUIRED_PHRASE || isRemediating}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors ${
                  confirmPhrase === REQUIRED_PHRASE && !isRemediating
                    ? "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20" 
                    : "bg-slate-800 text-slate-500 cursor-not-allowed"
                }`}
              >
                {isRemediating ? <RefreshCw size={16} className="animate-spin" /> : <Wrench size={16} />}
                {isRemediating ? "Executing..." : "Execute Fix"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
