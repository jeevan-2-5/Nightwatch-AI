import React, { useState, useEffect } from 'react';
import { AuthProvider } from './context/AuthContext';
import { DemoProvider, useDemo } from './context/DemoContext';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { OverviewDashboard } from './components/dashboard/OverviewDashboard';
import { IncidentsList } from './components/incidents/IncidentsList';
import { InvestigationWorkspace } from './components/investigation/InvestigationWorkspace';
import { ServicesTopology } from './components/services/ServicesTopology';
import { TelemetryExplorer } from './components/telemetry/TelemetryExplorer';
import { MLInsightsView } from './components/ml/MLInsightsView';
import { RemediationCenter } from './components/remediation/RemediationCenter';
import { IncidentHistoryView } from './components/history/IncidentHistoryView';
import { IntegrationsView } from './components/integrations/IntegrationsView';
import { AuditLogsView } from './components/audit/AuditLogsView';
import { SettingsView } from './components/settings/SettingsView';
import { api } from './lib/api-client';

const MainShell: React.FC = () => {
  const { refreshTrigger } = useDemo();
  const [currentTab, setCurrentTab] = useState<NavTab>('overview');
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [openCount, setOpenCount] = useState(0);
  const [pendingRemediationsCount, setPendingRemediationsCount] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    async function fetchBadgeCounts() {
      try {
        const [inc, rem] = await Promise.all([
          api.getIncidents({ status: 'OPEN' }),
          api.getRemediations(),
        ]);
        setOpenCount(inc.total);
        setPendingRemediationsCount(
          rem.items.filter((r) => r.status === 'PENDING_APPROVAL' || r.status === 'PROPOSED').length
        );
      } catch (err) {
        // silent fallback
      }
    }
    fetchBadgeCounts();
  }, [refreshTrigger]);

  const handleSelectIncident = (id: string) => {
    setSelectedIncidentId(id);
    setCurrentTab('investigations');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070a12] text-slate-100 font-sans">
      {/* Collapsible Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'investigations') {
            setSelectedIncidentId(null);
          }
        }}
        openIncidentsCount={openCount}
        pendingApprovalsCount={pendingRemediationsCount}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Mobile Backdrop Overlay */}
      {!sidebarCollapsed && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
          onClick={() => setSidebarCollapsed(true)}
          aria-hidden="true"
        />
      )}

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden w-full">
        <Navbar
          onSearch={(q) => setSearchQuery(q)}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 overflow-y-auto px-6 py-6" id="main-content">
          {currentTab === 'overview' && (
            <OverviewDashboard
              onSelectIncident={handleSelectIncident}
              onNavigateTab={(t) => setCurrentTab(t)}
            />
          )}

          {currentTab === 'incidents' && (
            <IncidentsList
              onSelectIncident={handleSelectIncident}
              searchFilter={searchQuery}
            />
          )}

          {currentTab === 'investigations' && (
            <InvestigationWorkspace
              incidentId={selectedIncidentId || 'INC-4091'}
              onBack={() => {
                setSelectedIncidentId(null);
                setCurrentTab('incidents');
              }}
            />
          )}

          {currentTab === 'services' && <ServicesTopology />}

          {currentTab === 'telemetry' && <TelemetryExplorer />}

          {currentTab === 'ml' && <MLInsightsView />}

          {currentTab === 'remediation' && <RemediationCenter />}

          {currentTab === 'history' && <IncidentHistoryView />}

          {currentTab === 'integrations' && <IntegrationsView />}

          {currentTab === 'audit' && <AuditLogsView />}

          {currentTab === 'settings' && <SettingsView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <DemoProvider>
        <MainShell />
      </DemoProvider>
    </AuthProvider>
  );
}
