import { createContext, useContext, type ReactNode } from "react";

export interface LayoutContextValue {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  setTopbarRightContent: (content: ReactNode | null) => void;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout deve ser utilizado dentro de um AppLayout.");
  }
  return context;
}
