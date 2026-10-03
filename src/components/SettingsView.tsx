import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  ShieldCheck, 
  CheckCircle2, 
  AlertOctagon, 
  RefreshCw, 
  LogOut,
  Key
} from 'lucide-react';
import { 
  ManagerProfileDTO, 
  validateConnectionApi
} from '../utils/api';
import { CredentialService } from '../services/credentialService';

interface SettingsViewProps {
  activeManager: ManagerProfileDTO;
  onManagerUpdated: (mgr: ManagerProfileDTO) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  activeManager,
  onManagerUpdated,
}) => {
  // Connection Form State
  const [org, setOrg] = useState(activeManager.organization || 'caterpillar');
  const [project, setProject] = useState(activeManager.project || 'CAT Digital');
  const [patInput, setPatInput] = useState('');
  const [isReplacingPat, setIsReplacingPat] = useState(false);

  // Connection State derived from active session / CredentialService
  const hasSessionPat = CredentialService.hasPat();
  const isConnected = activeManager.isConnected || hasSessionPat;
  const maskedPat = CredentialService.getMaskedPat() || (isConnected ? '••••••••9918' : null);

  // Validation state
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    message: string;
    permissions?: {
      workItemRead: boolean;
      workItemUpdate: boolean;
    };
  } | null>(null);

  // Initialize session token if none exists but manager is connected in mock mode
  useEffect(() => {
    if (!CredentialService.hasPat() && activeManager.isConnected) {
      CredentialService.setPat('demo-ado-pat-mock-token-9918');
      CredentialService.setConnection({
        connected: true,
        organization: org,
        project: project,
        canRead: true,
        canWrite: true,
        lastValidatedAt: new Date().toISOString(),
      });
    }
  }, [activeManager.isConnected, org, project]);

  // Handle Validate and Connect
  const handleValidateAndConnect = async () => {
    const tokenToValidate = patInput.trim();
    if (!org.trim()) {
      alert('Organization name is required.');
      return;
    }
    if (!project.trim()) {
      alert('Project name is required.');
      return;
    }
    if (!tokenToValidate) {
      alert('Please enter a Personal Access Token (PAT).');
      return;
    }

    setIsValidating(true);
    setValidationResult(null);

    try {
      const res = await validateConnectionApi({
        organization: org.trim(),
        project: project.trim(),
        pat: tokenToValidate,
      });

      if (res.success && res.data.connected) {
        // Stored exclusively in browser sessionStorage
        CredentialService.setPat(tokenToValidate);
        CredentialService.setConnection({
          connected: true,
          organization: res.data.organization,
          project: res.data.project,
          canRead: res.data.canRead,
          canWrite: res.data.canWrite,
          lastValidatedAt: new Date().toISOString(),
        });

        const updatedMgr: ManagerProfileDTO = {
          ...activeManager,
          organization: res.data.organization,
          project: res.data.project,
          isConnected: true,
          maskedPat: '••••••••' + tokenToValidate.slice(-4),
          lastValidatedAt: new Date().toISOString(),
          permissions: {
            orgAccess: true,
            projectAccess: true,
            workItemRead: res.data.canRead,
            workItemUpdate: res.data.canWrite,
          }
        };

        setValidationResult({
          success: true,
          message: `Connected successfully to ${res.data.organization}/${res.data.project}.`,
          permissions: {
            workItemRead: res.data.canRead,
            workItemUpdate: res.data.canWrite,
          },
        });

        onManagerUpdated(updatedMgr);
        setIsReplacingPat(false);
        setPatInput('');
      } else {
        setValidationResult({
          success: false,
          message: 'Connection validation failed. Check organization, project, or PAT scope.',
        });
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

  // Handle Disconnect (Section 22)
  const handleDisconnect = () => {
    if (!confirm('Disconnect from Azure DevOps? This will clear your connection session.')) {
      return;
    }

    CredentialService.disconnect();

    const disconnectedMgr: ManagerProfileDTO = {
      ...activeManager,
      isConnected: false,
      maskedPat: undefined,
      permissions: {
        orgAccess: false,
        projectAccess: false,
        workItemRead: false,
        workItemUpdate: false,
      }
    };

    onManagerUpdated(disconnectedMgr);
    setIsReplacingPat(false);
    setPatInput('');
    setValidationResult(null);
  };

  // Quick fill demo token
  const handleFillDemoToken = () => {
    setOrg('caterpillar');
    setProject('CAT Digital');
    setPatInput('ado-pat-demo-secret-key-9918');
  };

  return (
    <div className="flex flex-col gap-5 max-w-4xl mx-auto w-full">
      
      {/* Top Header */}
      <div className="bg-white border border-[#E5E7EB] p-5 rounded shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#1F2937] tracking-tight">
            Azure DevOps Connection
          </h2>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Configure manager connection credentials for Azure DevOps.
          </p>
        </div>

        {isConnected ? (
          <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>● Connected</span>
          </span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-mono font-semibold text-neutral-600 bg-neutral-100 border border-neutral-200 px-3 py-1 rounded">
            <span className="w-2 h-2 rounded-full bg-neutral-400" />
            <span>● Not Connected</span>
          </span>
        )}
      </div>

      {/* Main Connection Form Card (Sections 22, 26, 27) */}
      <div className="bg-white border border-[#E5E7EB] p-6 rounded shadow-[0_1px_2px_rgba(0,0,0,0.03)] flex flex-col gap-5">
        
        {/* Organization & Project Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-[11px] font-mono uppercase text-[#6B7280] font-semibold block mb-1">
              Organization
            </label>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              disabled={isConnected && !isReplacingPat}
              placeholder="e.g. caterpillar"
              className="w-full h-9 px-3 bg-white border border-[#D1D5DB] rounded text-xs text-[#1F2937] font-mono focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none disabled:bg-[#F9FAFB] disabled:text-[#6B7280] transition-all"
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
              placeholder="e.g. CAT Digital"
              className="w-full h-9 px-3 bg-white border border-[#D1D5DB] rounded text-xs text-[#1F2937] font-mono focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none disabled:bg-[#F9FAFB] disabled:text-[#6B7280] transition-all"
            />
          </div>
        </div>

        {/* Personal Access Token (PAT) Input Box */}
        <div className="bg-[#F9FAFB] p-4 rounded border border-[#E5E7EB] flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-[#1F2937] flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-[#1C1C1C]" />
              <span>Personal Access Token</span>
            </label>

            {/* When connected: [ Replace PAT ] [ Disconnect ] */}
            {isConnected && !isReplacingPat && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsReplacingPat(true)}
                  className="px-2.5 py-1 text-xs font-semibold bg-white border border-[#D1D5DB] hover:bg-[#F3F4F6] text-[#1F2937] rounded transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3 h-3 text-[#1C1C1C]" />
                  <span>Replace PAT</span>
                </button>
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="px-2.5 py-1 text-xs font-semibold bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3 text-red-600" />
                  <span>Disconnect</span>
                </button>
              </div>
            )}
          </div>

          {isConnected && !isReplacingPat ? (
            <div className="flex items-center justify-between bg-white border border-[#E5E7EB] p-2.5 rounded">
              <div className="flex items-center gap-2.5 font-mono text-xs text-[#374151]">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span className="font-bold tracking-widest">{maskedPat}</span>
              </div>
              <span className="text-[11px] font-mono text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Connected
              </span>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder="Enter Personal Access Token..."
                  value={patInput}
                  onChange={(e) => setPatInput(e.target.value)}
                  className="flex-1 h-9 px-3 bg-white border border-[#D1D5DB] rounded text-xs text-[#1F2937] font-mono focus:border-[#FFCD11] focus:ring-1 focus:ring-[#FFCD11] outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={handleFillDemoToken}
                  className="h-9 px-3 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] border border-[#D1D5DB] rounded text-xs font-mono shrink-0 cursor-pointer"
                  title="Fill sample token for testing"
                >
                  Fill Sample
                </button>
              </div>

              {isReplacingPat && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setIsReplacingPat(false);
                      setPatInput('');
                    }}
                    className="text-xs text-[#6B7280] hover:text-[#1F2937] underline cursor-pointer"
                  >
                    Cancel Replacement
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Validation Result Banner */}
        {validationResult && (
          <div className={`p-3.5 rounded border text-xs font-mono flex flex-col gap-1.5 ${
            validationResult.success 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-2 font-bold">
              {validationResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Connection Verified</span>
                </>
              ) : (
                <>
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  <span>Validation Error</span>
                </>
              )}
            </div>
            <p className="text-[11px]">{validationResult.message}</p>
          </div>
        )}

        {/* Action Button: Connect */}
        {(!isConnected || isReplacingPat) && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleValidateAndConnect}
              disabled={isValidating}
              className="h-9 px-6 bg-[#FFCC00] hover:bg-[#F2C200] text-[#1C1C1C] font-bold text-xs uppercase rounded transition-colors shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
              <span>{isValidating ? 'Connecting...' : 'Connect'}</span>
            </button>
          </div>
        )}

      </div>

    </div>
  );
};
