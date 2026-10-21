import React, { createContext, useContext, useState, useEffect } from 'react';
import { ScenarioPreset } from '../types';
import { api } from '../lib/api-client';

interface DemoContextType {
  scenario: ScenarioPreset;
  setScenario: (scenario: ScenarioPreset) => Promise<void>;
  isLoading: boolean;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [scenario, setScenarioState] = useState<ScenarioPreset>('db_exhaustion');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const triggerRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const setScenario = async (newScenario: ScenarioPreset) => {
    setIsLoading(true);
    try {
      await api.seedScenario(newScenario);
      setScenarioState(newScenario);
      triggerRefresh();
    } catch (err) {
      console.error('Failed to switch scenario:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DemoContext.Provider
      value={{
        scenario,
        setScenario,
        isLoading,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = () => {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used inside DemoProvider');
  return ctx;
};
