import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";

export interface SubNavStep {
  id: string;
  label?: string;
  restore: () => void;
}

export interface BreadcrumbItem {
  id: string;
  label: string;
  onClick?: () => void;
}

interface SubNavigationContextValue {
  hasSubHistory: boolean;
  currentBackLabel?: string;
  breadcrumbs: BreadcrumbItem[];
  setBreadcrumbs: (items: BreadcrumbItem[]) => void;
  pushSubStep: (step: SubNavStep) => void;
  popSubStep: (id?: string) => void;
  goBackSubStep: () => boolean;
  clearSubSteps: () => void;
}

const SubNavigationContext = createContext<SubNavigationContextValue | null>(null);

export const SubNavigationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const stackRef = useRef<SubNavStep[]>([]);
  const [stackSnapshot, setStackSnapshot] = useState<SubNavStep[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  const syncSnapshot = useCallback(() => {
    setStackSnapshot([...stackRef.current]);
  }, []);

  const pushSubStep = useCallback(
    (step: SubNavStep) => {
      const existingIdx = stackRef.current.findIndex((s) => s.id === step.id);
      if (existingIdx !== -1) {
        stackRef.current[existingIdx] = step;
        syncSnapshot();
        return;
      }
      stackRef.current.push(step);
      syncSnapshot();
    },
    [syncSnapshot]
  );

  const popSubStep = useCallback(
    (id?: string) => {
      if (stackRef.current.length === 0) return;

      if (id) {
        const idx = stackRef.current.map((s) => s.id).lastIndexOf(id);
        if (idx === -1) return;
        stackRef.current.splice(idx);
        syncSnapshot();
        return;
      }

      stackRef.current.pop();
      syncSnapshot();
    },
    [syncSnapshot]
  );

  const goBackSubStep = useCallback((): boolean => {
    const step = stackRef.current.pop();
    if (!step) return false;
    syncSnapshot();
    step.restore();
    return true;
  }, [syncSnapshot]);

  const clearSubSteps = useCallback(() => {
    stackRef.current = [];
    setStackSnapshot([]);
    setBreadcrumbs([]);
  }, []);

  const topStep = stackSnapshot[stackSnapshot.length - 1];

  return (
    <SubNavigationContext.Provider
      value={{
        hasSubHistory: stackSnapshot.length > 0,
        currentBackLabel: topStep?.label,
        breadcrumbs,
        setBreadcrumbs,
        pushSubStep,
        popSubStep,
        goBackSubStep,
        clearSubSteps,
      }}
    >
      {children}
    </SubNavigationContext.Provider>
  );
};

export function useSubNavigation(): SubNavigationContextValue {
  const ctx = useContext(SubNavigationContext);
  if (!ctx) {
    throw new Error("useSubNavigation must be used inside <SubNavigationProvider>");
  }
  return ctx;
}