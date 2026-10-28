import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  FolderKanban, 
  CheckCircle2, 
  Settings,
  X
} from 'lucide-react';
import { MainNavTab } from './Header';
import { ManagerProfileDTO } from '../utils/api';
import { SitNexusBrandLockup } from './SitNexusBrandLockup';

interface SidebarProps {
  activeTab: MainNavTab;
  setActiveTab: (tab: MainNavTab) => void;
  activeManager: ManagerProfileDTO;
  resourceCount: number;
  onTriggerEasterEgg?: () => void;
  isCollapsed?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  activeManager,
  resourceCount,
  onTriggerEasterEgg,
  isCollapsed = false,
  isMobileOpen = false,
  onCloseMobile,
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

  const navItems = [
    {
      id: 'sprint' as MainNavTab,
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'resources' as MainNavTab,
      label: 'Resource Master',
      icon: Users,
      badge: resourceCount,
    },
    {
      id: 'projects' as MainNavTab,
      label: 'Projects',
      icon: FolderKanban,
    },
    {
      id: 'closure' as MainNavTab,
      label: 'Sprint Closure',
      icon: CheckCircle2,
      isWarningModule: true,
    },
    {
      id: 'settings' as MainNavTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  const handleSelectTab = (tabId: MainNavTab) => {
    setActiveTab(tabId);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // Reusable navigation body component
  const renderSidebarContent = (isDrawer = false) => (
    <>
      {/* Top Brand Block: Official Caterpillar + SIT Nexus Brand Lockup */}
      <div>
        <div className="p-3.5 border-b border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between">
          <SitNexusBrandLockup
            layout="stacked"
            size="sm"
            showSubtitle={true}
            onClick={handleEasterEggInteraction}
          />
          {isDrawer && onCloseMobile && (
            <button
              type="button"
              onClick={onCloseMobile}
              className="p-1 rounded-lg text-[#6B7280] hover:text-[#111827] hover:bg-[#E5E7EB] transition-colors cursor-pointer"
              aria-label="Close mobile navigation"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation Items (Light mode with Yellow accent for selected item) */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-150 ease-out text-left cursor-pointer ${
                  isActive
                    ? 'bg-[#FEF9C3] text-[#111827] border-l-4 border-[#FFCD11] shadow-2xs font-bold'
                    : 'text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#854D0E]' : 'text-[#6B7280]'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-semibold ${
                    isActive ? 'bg-[#FFCD11] text-[#111827]' : 'bg-[#E5E7EB] text-[#4B5563]'
                  }`}>
                    {item.badge}
                  </span>
                )}

                {item.isWarningModule && !isActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EAB308]" />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Area: Clean Connection Status (Section 20 & 25 - Light, minimal) */}
      <div className="p-3.5 border-t border-[#E5E7EB] bg-[#FAFAFA] flex flex-col gap-2 text-xs font-mono">
        {/* Connection Status indicator */}
        <div className="flex items-center justify-between px-1 text-[11px]">
          <span className="text-[#6B7280] font-medium font-sans">Azure DevOps</span>
          {activeManager.isConnected ? (
            <span className="flex items-center gap-1.5 font-bold text-emerald-700">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Connected</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5 font-bold text-[#6B7280]">
              <span className="inline-block w-2 h-2 rounded-full bg-neutral-400" />
              <span>Not Connected</span>
            </span>
          )}
        </div>

        <div 
          onClick={handleEasterEggInteraction}
          className="px-1 text-[10px] text-[#9CA3AF] flex items-center justify-between border-t border-[#F1F3F5] pt-2 cursor-pointer hover:text-[#6B7280] transition-colors"
          title="Platform v2.5.0"
        >
          <span>Enterprise Standup</span>
          <span className="text-[#6B7280] font-semibold">v2.5.0</span>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* 1. Mobile Backdrop & Drawer */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Sliding Drawer */}
          <aside className="fixed inset-y-0 left-0 w-64 bg-white text-[#1F2937] flex flex-col justify-between h-full select-none border-r border-[#E5E7EB] shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* 2. Desktop Collapsible Sidebar */}
      {!isCollapsed && (
        <aside className="hidden lg:flex w-56 sm:w-60 bg-white text-[#1F2937] flex-col justify-between shrink-0 h-screen sticky top-0 z-40 select-none border-r border-[#E5E7EB] shadow-[1px_0_3px_rgba(0,0,0,0.02)] transition-all duration-200 ease-in-out">
          {renderSidebarContent(false)}
        </aside>
      )}
    </>
  );
};
