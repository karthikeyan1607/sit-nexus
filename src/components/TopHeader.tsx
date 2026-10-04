import React, { useState } from 'react';
import { 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { MainNavTab } from './Header';
import { ManagerProfileDTO } from '../utils/api';
import { CredentialService } from '../services/credentialService';
import { SitNexusBrandLockup } from './SitNexusBrandLockup';

interface TopHeaderProps {
  activeTab: MainNavTab;
  currentSprint?: string;
  activeManager: ManagerProfileDTO;
  dataSource?: 'mock' | 'azure';
  onToggleMode?: () => void;
  onOpenSettings: () => void;
  onTriggerEasterEgg?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  currentSprint,
  activeManager,
  dataSource = 'mock',
  onToggleMode,
  onOpenSettings,
  onTriggerEasterEgg,
}) => {
  const [clickCount, setClickCount] = useState(0);

  const handleEasterEggInteraction = () => {
    const next = clickCount + 1;
    if (next >= 5) {
      setClickCount(0);
      onTriggerEasterEgg?.();
    } else {
      setClickCount(next);
      setTimeout(() => setClickCount(0), 3000);
    }
  };

  const titles: Record<MainNavTab, { title: string; subtitle: string }> = {
    sprint: {
      title: 'Dashboard',
      subtitle: 'Sprint Intelligence & Execution Visibility Platform',
    },
    resources: {
      title: 'Resource Master',
      subtitle: 'Manage teams, region assignments, and Azure DevOps identity mapping',
    },
    projects: {
      title: 'Projects',
      subtitle: 'Azure DevOps tag intelligence and visible team workloads',
    },
    closure: {
      title: 'Sprint Closure',
      subtitle: 'Review and close eligible User Stories for a completed sprint',
    },
    settings: {
      title: 'Settings',
      subtitle: 'Azure DevOps connection and configuration',
    },
  };

  const { title, subtitle } = titles[activeTab] || titles.sprint;
  const isConnected = activeManager.isConnected || CredentialService.hasPat();

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] px-5 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      
      {/* Left: Official Caterpillar + SIT Nexus Brand Lockup (Matches Screenshot) */}
      <div className="flex items-center gap-3 min-w-0">
        <SitNexusBrandLockup
          size="md"
          showSubtitle={true}
          onClick={handleEasterEggInteraction}
        />

        {/* Current Active Page Context */}
        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-[#E5E7EB] text-xs shrink-0">
          <span className="font-semibold text-[#4B5563] font-sans">{title}</span>
        </div>
      </div>

      {/* Right: Azure DevOps Connection Status */}
      <div className="flex items-center gap-2.5 text-xs font-mono">
        
        {/* Real Azure DevOps Indicator */}
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] border font-bold transition-all duration-150 ease-out active:scale-[0.98] cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
          title="SIT Nexus Real Azure DevOps REST API Integration"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
          <span>REAL AZURE DEVOPS</span>
        </button>

        {/* Connection Status Indicator */}
        <button 
          type="button"
          onClick={onOpenSettings}
          className="h-8 flex items-center gap-1.5 px-3 bg-[#F9FAFB] hover:bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg text-[#374151] cursor-pointer transition-all duration-150 ease-out active:scale-[0.98] text-[11px]"
          title={isConnected ? "Azure DevOps Connected" : "Azure DevOps Not Connected - Click to configure"}
        >
          {isConnected ? (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="font-semibold text-emerald-700">Connected</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
              <span className="font-semibold text-[#6B7280]">Not Connected</span>
            </>
          )}
        </button>

      </div>

    </header>
  );
};

