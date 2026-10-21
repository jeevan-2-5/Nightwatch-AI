import React from 'react';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  BrainCircuit,
  Network,
  Terminal,
  Wrench,
  History,
  Boxes,
  ScrollText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Radio,
  Cpu,
} from 'lucide-react';
import { useDemo } from '../../context/DemoContext';

export type NavTab =
  | 'overview'
  | 'incidents'
  | 'investigations'
  | 'services'
  | 'telemetry'
  | 'ml'
  | 'remediation'
  | 'history'
  | 'integrations'
  | 'audit'
  | 'settings';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  openIncidentsCount: number;
  pendingApprovalsCount: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  openIncidentsCount,
  pendingApprovalsCount,
  collapsed,
  onToggleCollapse,
}) => {
  const { scenario } = useDemo();

  const navItems = [
    { id: 'overview' as NavTab, label: 'Overview', icon: Activity },
    { id: 'incidents' as NavTab, label: 'Incidents', icon: AlertTriangle, badge: openIncidentsCount > 0 ? openIncidentsCount : undefined, badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
    { id: 'investigations' as NavTab, label: 'Investigations', icon: BrainCircuit },
    { id: 'services' as NavTab, label: 'Services & Map', icon: Network },
    { id: 'telemetry' as NavTab, label: 'Telemetry', icon: Terminal },
    { id: 'ml' as NavTab, label: 'ML Insights', icon: Cpu },
    { id: 'remediation' as NavTab, label: 'Remediation', icon: Wrench, badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined, badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30' },
    { id: 'history' as NavTab, label: 'Incident History', icon: History },
    { id: 'integrations' as NavTab, label: 'Integrations', icon: Boxes },
    { id: 'audit' as NavTab, label: 'Audit Logs', icon: ScrollText },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={`fixed md:relative inset-y-0 left-0 z-40 flex flex-col border-r border-slate-800/80 bg-[#0d1322] transition-all duration-300 select-none shrink-0 ${
        collapsed ? '-translate-x-full md:translate-x-0 md:w-16' : 'translate-x-0 w-64 shadow-2xl md:shadow-none'
      }`}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-800/80 bg-[#0b0f19]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400/30">
            <ShieldAlert className="h-5 w-5 text-slate-950" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-extrabold tracking-wider text-sm text-slate-100 flex items-center gap-1.5">
                NIGHTWATCH<span className="text-cyan-400">AI</span>
                <span className="rounded bg-cyan-950/80 px-1.5 py-0.2 text-[10px] font-mono text-cyan-300 border border-cyan-800/50">
                  v2.1
                </span>
              </span>
              <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                Autonomous SRE
              </span>
            </div>
          )}
        </div>
        <button
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-4" aria-label="Main Navigation">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                onSelectTab(item.id);
                if (typeof window !== 'undefined' && window.innerWidth < 768 && !collapsed) {
                  onToggleCollapse();
                }
              }}
              title={collapsed ? item.label : undefined}
              className={`group flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-xs font-medium transition-all ${
                isActive
                  ? 'bg-cyan-500/10 text-cyan-300 border-l-2 border-cyan-400 shadow-sm shadow-cyan-950/30'
                  : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              />
              {!collapsed && (
                <div className="flex flex-1 items-center justify-between overflow-hidden">
                  <span className="truncate">{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-mono font-semibold ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer System Telemetry Status */}
      <div className="border-t border-slate-800/80 bg-[#0b0f19] p-3 text-xs">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
                Telemetry Pipeline
              </span>
              <span className="font-mono text-emerald-400 font-medium">ONLINE</span>
            </div>
            <div className="rounded border border-slate-800 bg-slate-900/80 p-2">
              <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                <span>Active Scenario:</span>
                <span className="font-mono text-cyan-400 uppercase font-semibold">
                  {scenario.replace('_', ' ')}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                <div className="h-full bg-cyan-400 transition-all duration-500" style={{ width: '85%' }} />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center" title="Telemetry Pipeline ONLINE">
            <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
          </div>
        )}
      </div>
    </aside>
  );
};
