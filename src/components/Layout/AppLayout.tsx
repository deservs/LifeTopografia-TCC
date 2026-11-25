import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Outlet, useLocation } from "react-router-dom";

import Footer from "../Footer/footer";
import Sidebar from "../Sidebar/sidebar";
import Topbar from "../Topbar/topbar";
import "./AppLayout.css";

interface LayoutContextValue {
  isSidebarOpen: boolean;
  openSidebar: () => void;
  closeSidebar: () => void;
  setTopbarRightContent: (content: ReactNode | null) => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

interface AppLayoutProps {
  showTopbar?: boolean;
  showFooter?: boolean;
}

export function AppLayout({
  showTopbar = true,
  showFooter = true,
}: AppLayoutProps) {
  const { pathname } = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [topbarRightContent, setTopbarRightContent] =
    useState<ReactNode | null>(null);

  const openSidebar = useCallback(() => {
    setIsSidebarOpen(true);
  }, []);

  const closeSidebar = useCallback(() => {
    setIsSidebarOpen(false);
  }, []);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  return (
    <LayoutContext.Provider
      value={{
        isSidebarOpen,
        openSidebar,
        closeSidebar,
        setTopbarRightContent,
      }}
    >
      <div className="app-layout">
        <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

        {showTopbar && (
          <Topbar
            isSidebarOpen={isSidebarOpen}
            onOpenSidebar={openSidebar}
            rightContent={topbarRightContent ?? undefined}
          />
        )}

        <div className="app-layout__body">
          <Outlet />
        </div>

        {showFooter && <Footer />}
      </div>
    </LayoutContext.Provider>
  );
}

export function useLayout(): LayoutContextValue {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout deve ser utilizado dentro de um AppLayout.");
  }
  return context;
}

export default AppLayout;
