import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cpu, 
  CheckCircle2, 
  KeyRound, 
  ShieldCheck, 
  RefreshCw,
  AlertOctagon,
  LogOut,
  Key,
  Lock,
  Globe2,
  FolderGit2
} from 'lucide-react';
import { FilterState } from '../types';
import { 
  ManagerProfileDTO, 
  validateConnectionApi, 
  getAuthStatus
} from '../utils/api';
import { CredentialService } from '../services/credentialService';

interface AdoConfigModalProps {
  currentFilter: FilterState;
  onClose: () => void;
  onConnectionSuccess: (manager: ManagerProfileDTO) => void;
}

export const AdoConfigModal: React.FC<AdoConfigModalProps> = ({
  currentFilter,
  onClose,
  onConnectionSuccess,
}) => {
  const [activeManager, setActiveManager] = useState<ManagerProfileDTO | null>(null);

  // Form states
  const [org, setOrg] = useState('caterpillar');
  const [project, setProject] = useState('CAT Digital');
  const [patInput, setPatInput] = useState('');
  const [isReplacingPat, setIsReplacingPat] = useState(false);

  // Validation / connection states
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
    permissions?: {
      workItemRead: boolean;
      workItemUpdate: boolean;
    };
  } | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const data = await getAuthStatus();
      if (data?.activeManager) {
        setActiveManager(data.activeManager);
        setOrg(data.activeManager.organization || 'caterpillar');
        setProject(data.activeManager.project || 'CAT Digital');
      }
    } catch (err) {
      console.error('Failed to load auth status:', err);
    }
  };

  const isConnected = Boolean(activeManager?.isConnected || CredentialService.hasPat());
  const maskedPat = CredentialService.getMaskedPat() || (isConnected ? '••••••••9918' : null);

  const handleValidateAndConnect = async () => {
    const token = patInput.trim();
    if (!org.trim() || !project.trim() || !token) {
      alert('Please provide Organization, Project, and Personal Access Token.');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await validateConnectionApi({
        organization: org.trim(),
        project: project.trim(),
        pat: token,
      });

      if (res.success && res.data.connected) {
        CredentialService.setPat(token);
        CredentialService.setConnection({
          connected: true,
          organization: res.data.organization,
          project: res.data.project,
          canRead: res.data.canRead,
          canWrite: res.data.canWrite,
          lastValidatedAt: new Date().toISOString(),
        });

        const updated: ManagerProfileDTO = {
          id: activeManager?.id || 'mgr-1',
          name: activeManager?.name || 'Karthikeyan',
          region: activeManager?.region || 'All',
          organization: res.data.organization,
          project: res.data.project,
          isConnected: true,
          maskedPat: '••••••••' + token.slice(-4),
          lastValidatedAt: new Date().toISOString(),
          permissions: {
            orgAccess: true,
            projectAccess: true,
            workItemRead: res.data.canRead,
            workItemUpdate: res.data.canWrite,
          }
        };

        setActiveManager(updated);
        setValidationResult({
          success: true,
          message: 'Connection validated and active in browser sessionStorage.',
          permissions: {
            workItemRead: res.data.canRead,
            workItemUpdate: res.data.canWrite,
          }
        });

        setIsReplacingPat(false);
        setPatInput('');
        onConnectionSuccess(updated);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setValidationResult({
        success: false,
        message: msg,
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleDisconnect = () => {
    CredentialService.disconnect();
    if (activeManager) {
      const disconnected: ManagerProfileDTO = {
        ...activeManager,
        isConnected: false,
        maskedPat: undefined,
      };
      setActiveManager(disconnected);
      onConnectionSuccess(disconnected);
    }
    setIsReplacingPat(false);
    setPatInput('');
    setValidationResult(null);
  };

  const handleFillDemoToken = () => {
    setOrg('caterpillar');
    setProject('CAT Digital');
    setPatInput('ado-pat-demo-secret-key-9918');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#D1D5DB] rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col text-[#1F2937] font-sans">
        
        {/* Header */}
        <div className="bg-[#1C1C1C] text-white px-5 py-4 flex items-center justify-between border-b-2 border-[#FFCC00]">
          <div className="flex items-center gap-2.5">
            <Cpu className="w-5 h-5 text-[#FFCC00]" />
            <div>
              <h3 className="font-bold text-sm text-white tracking-tight uppercase">
                Azure DevOps Connection
              </h3>
              <span className="text-[11px] text-neutral-400 font-mono">
                SprintSync Active Session Architecture
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-4 text-xs">

          {/* Connection status header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#F1F3F5]">
            <span className="font-semibold text-neutral-600">Current Status:</span>
            {isConnected ? (
              <span className="font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="font-bold text-neutral-600 bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded font-mono text-[11px] flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-neutral-400" />
                <span>Disconnected</span>
              </span>
            )}
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-mono uppercase text-[#6B7280] font-semibold block mb-1">
                Organization
              </label>
              <input
                type="text"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                disabled={isConnected && !isReplacingPat}
                className="w-full h-8 px-2.5 bg-white border border-[#D1D5DB] rounded text-xs text-[#1F2937] font-mono focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none disabled:bg-[#F9FAFB] transition-all"
              />
            </div>
            <div>
              <label className="text-[11px] font-mono uppercase text-[#6B7280] font-semibold block mb-1">
                Project
              </label>
              <input
                type="text"
                value={project}
                onChange={(e) => setProject(e.target.value)}
                disabled={isConnected && !isReplacingPat}
                className="w-full h-8 px-2.5 bg-white border border-[#D1D5DB] rounded text-xs text-[#1F2937] font-mono focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none disabled:bg-[#F9FAFB] transition-all"
              />
            </div>
          </div>

          {/* PAT Display / Entry */}
          <div className="bg-[#F9FAFB] p-3.5 rounded border border-[#E5E7EB] flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-[#1F2937] flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-[#1C1C1C]" />
                <span>Personal Access Token</span>
              </label>

              {isConnected && !isReplacingPat && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsReplacingPat(true)}
                    className="text-xs font-semibold text-[#1C1C1C] hover:underline flex items-center gap-1"
                  >
                    <Key className="w-3 h-3" />
                    <span>Replace PAT</span>
                  </button>
                  <span className="text-[#D1D5DB]">·</span>
                  <button
                    type="button"
                    onClick={handleDisconnect}
                    className="text-xs font-semibold text-red-600 hover:underline flex items-center gap-1"
                  >
                    <LogOut className="w-3 h-3" />
                    <span>Disconnect</span>
                  </button>
                </div>
              )}
            </div>

            {isConnected && !isReplacingPat ? (
              <div className="flex items-center justify-between bg-white border border-[#E5E7EB] p-2 rounded">
                <span className="font-mono font-bold text-[#374151] tracking-widest">{maskedPat}</span>
                <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">sessionStorage</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter Personal Access Token..."
                    value={patInput}
                    onChange={(e) => setPatInput(e.target.value)}
                    className="flex-1 h-8 px-2.5 bg-white border border-[#D1D5DB] rounded text-xs text-[#1F2937] font-mono focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={handleFillDemoToken}
                    className="h-8 px-2.5 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] border border-[#D1D5DB] rounded text-[11px] font-mono"
                  >
                    Demo
                  </button>
                </div>
                {isReplacingPat && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplacingPat(false);
                      setPatInput('');
                    }}
                    className="text-right text-[11px] text-[#6B7280] hover:text-[#1F2937] underline"
                  >
                    Cancel Replacement
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Validation Feedback */}
          {validationResult && (
            <div className={`p-2.5 rounded border text-xs font-mono flex flex-col gap-1 ${
              validationResult.success 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                : 'bg-red-50 border-red-200 text-red-800'
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                {validationResult.success ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <AlertOctagon className="w-3.5 h-3.5 text-red-600" />}
                <span>{validationResult.success ? 'Validated Successfully' : 'Validation Failed'}</span>
              </div>
              <p className="text-[11px]">{validationResult.message}</p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="bg-[#F9FAFB] px-5 py-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] text-[#374151] text-xs font-semibold rounded"
          >
            Close
          </button>

          {(!isConnected || isReplacingPat) && (
            <button
              type="button"
              onClick={handleValidateAndConnect}
              disabled={isValidating}
              className="px-4 py-1.5 bg-[#FFCC00] hover:bg-[#F2C200] text-[#1C1C1C] text-xs font-bold uppercase rounded flex items-center gap-1.5 disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${isValidating ? 'animate-spin' : ''}`} />
              <span>{isValidating ? 'Validating...' : 'Connect'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
