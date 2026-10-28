import React, { useState } from 'react';
import { 
  Menu,
  PanelLeftClose
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
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  currentSprint,
  activeManager,
  dataSource = 'mock',
  onToggleMode,
  onOpenSettings,
  onTriggerEasterEgg,
  isSidebarCollapsed,
  onToggleSidebar,
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

  const { title } = titles[activeTab] || titles.sprint;
  const isConnected = activeManager.isConnected || CredentialService.hasPat();

  return (
    <header className="h-16 bg-white border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
      
      {/* Left: Sidebar Toggle Control + Official Caterpillar + SIT Nexus Brand Lockup */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#FFCD11] transition-colors cursor-pointer shrink-0 flex items-center justify-center"
          title={isSidebarCollapsed ? "Expand sidebar (Ctrl+B)" : "Collapse sidebar (Ctrl+B)"}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!isSidebarCollapsed}
        >
          {isSidebarCollapsed ? (
            <Menu className="w-5 h-5 stroke-[2.2]" />
          ) : (
            <PanelLeftClose className="w-5 h-5 stroke-[2.2]" />
          )}
        </button>

        <SitNexusBrandLockup
          size="md"
          showSubtitle={true}
          onClick={handleEasterEggInteraction}
        />

        {/* Current Active Page Context */}
        <div className="hidden md:flex items-center gap-2 pl-3 border-l border-[#E5E7EB] text-xs shrink-0">
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
          <span className="hidden sm:inline">REAL AZURE DEVOPS</span>
          <span className="sm:hidden">ADO</span>
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
