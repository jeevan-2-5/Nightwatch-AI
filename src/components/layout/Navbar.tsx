import React, { useState } from 'react';
import {
  Search,
  Bell,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  User as UserIcon,
  Menu,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useDemo } from '../../context/DemoContext';
import { ScenarioPreset, UserRole } from '../../types';

interface NavbarProps {
  onSearch: (query: string) => void;
  openCreateModal?: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onSearch, openCreateModal, onToggleSidebar }) => {
  const { user, role, setRole, usersList } = useAuth();
  const { scenario, setScenario, isLoading } = useDemo();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showScenarioMenu, setShowScenarioMenu] = useState(false);
  const [searchValue, setSearchValue] = useState('');

  const scenarios: { id: ScenarioPreset; label: string; desc: string }[] = [
    {
      id: 'db_exhaustion',
      label: 'Scenario 1: DB Connection Pool Exhaustion',
      desc: 'PgBouncer pool saturation, latency spike, preceding DB rollout',
    },
    {
      id: 'memory_pressure',
      label: 'Scenario 2: Worker Memory Pressure & OOM',
      desc: 'Heap exhaustion, periodic container evictions, queue lag',
    },
    {
      id: 'deployment_spike',
      label: 'Scenario 3: Deployment 5xx Regression',
      desc: 'Canary rollout triggers elevated HTTP 500 error rates',
    },
    {
      id: 'baseline_healthy',
      label: 'Scenario 4: Baseline Nominal (Healthy)',
      desc: 'Zero anomalies, low latency, steady state operations',
    },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
    onSearch(e.target.value);
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 w-full items-center justify-between border-b border-slate-800/80 bg-[#0b0f19]/90 px-4 sm:px-6 backdrop-blur">
      {/* Mobile Hamburger & Global Search */}
      <div className="flex items-center gap-2 flex-1 max-w-xs sm:max-w-sm mr-2">
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            aria-label="Toggle navigation drawer"
            className="md:hidden rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search incidents, traces, services (e.g. INC-4091, payment-api)..."
            className="w-full rounded-lg border border-slate-800 bg-slate-900/90 py-1.5 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 transition focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/30"
          />
        </div>
      </div>

      {/* Control Actions & Status */}
      <div className="flex items-center gap-3">
        {/* Environment Selector */}
        <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-300">
          <Layers className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-slate-400">Env:</span>
          <span className="font-mono font-medium text-slate-200">production-primary</span>
        </div>

        {/* Scenario Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowScenarioMenu(!showScenarioMenu)}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-lg border border-cyan-800/50 bg-cyan-950/40 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-900/40 transition shadow-sm shadow-cyan-950/30"
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
            <span className="font-mono">
              {isLoading ? 'Seeding...' : scenario.replace('_', ' ').toUpperCase()}
            </span>
            {isLoading && <RefreshCw className="h-3 w-3 animate-spin text-cyan-400" />}
          </button>

          {showScenarioMenu && (
            <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-800 bg-[#0d1322] p-2 shadow-2xl shadow-black z-50">
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                Switch Operational Scenario
              </div>
              <div className="mt-1 space-y-1">
                {scenarios.map((sc) => (
                  <button
                    key={sc.id}
                    onClick={() => {
                      setScenario(sc.id);
                      setShowScenarioMenu(false);
                    }}
                    className={`flex w-full flex-col text-left rounded-lg p-2.5 transition text-xs ${
                      scenario === sc.id
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-200'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span>{sc.label}</span>
                      {scenario === sc.id && <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />}
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5">{sc.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Health status indicator */}
        <div className="hidden lg:flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-400">
          <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
          <span className="text-slate-300">FastAPI & Workers</span>
          <span className="font-mono text-emerald-400 font-semibold text-[11px]">200 OK</span>
        </div>

        {/* User Role Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs text-slate-200 hover:border-slate-700 transition"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-cyan-900/80 text-cyan-300 font-bold text-[10px]">
              {user.name[0]}
            </div>
            <div className="flex flex-col text-left">
              <span className="text-[11px] font-semibold text-slate-200">{user.name.split(' ')[0]}</span>
              <span
                className={`text-[9px] font-mono px-1 rounded-sm w-fit ${
                  role === 'Admin'
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-800/50'
                    : role === 'Engineer'
                    ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-800/50'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {role}
              </span>
            </div>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 mt-2 w-64 rounded-xl border border-slate-800 bg-[#0d1322] p-2 shadow-2xl z-50">
              <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                Switch Role / Actor (RBAC Demo)
              </div>
              <div className="mt-1 space-y-1">
                {usersList.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => {
                      setRole(u.role);
                      setShowRoleMenu(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-lg p-2 text-left text-xs transition ${
                      role === u.role
                        ? 'bg-cyan-500/15 border border-cyan-500/30 text-cyan-200'
                        : 'hover:bg-slate-800/60 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-medium text-slate-200">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.email}</div>
                    </div>
                    <span className="font-mono text-[10px] uppercase font-semibold text-cyan-400">
                      {u.role}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
