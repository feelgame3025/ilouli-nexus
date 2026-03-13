import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../../contexts/AuthContext';
import GraphExplorer from '../../pages/GraphExplorer';
import NodeList from '../../pages/NodeList';
import IngestPage from '../../pages/IngestPage';
import AutomationPage from '../../pages/AutomationPage';
import './NexusLayout.css';

const NexusLayout = () => {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);
  const closeMobileMenu = () => setMobileMenuOpen(false);

  // Close mobile menu on route change
  useEffect(() => {
    closeMobileMenu();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Prevent background scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  // Check if current page is the graph explorer (needs dark bg, full width)
  const isGraphPage = location.pathname === '/';

  // Mobile header with hamburger
  const MobileHeader = () => (
    <div className="nexus-mobile-header">
      <button className="nexus-mobile-toggle" onClick={toggleMobileMenu} aria-label="메뉴 열기">
        <span></span>
        <span></span>
        <span></span>
      </button>
      <span className="nexus-mobile-title">Nexus</span>
    </div>
  );

  return (
    <div className="nexus-layout">
      {mobileMenuOpen && <div className="nexus-mobile-overlay" onClick={closeMobileMenu} />}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={closeMobileMenu}
      />
      <main className={`nexus-content ${isGraphPage ? 'nexus-content-graph' : ''}`}>
        <MobileHeader />
        <div className={isGraphPage ? 'nexus-content-full' : 'nexus-content-inner'}>
          <Routes>
            <Route path="/" element={<GraphExplorer />} />
            <Route path="/nodes" element={isAdmin ? <NodeList /> : <Navigate to="/" replace />} />
            <Route path="/ingest" element={isAdmin ? <IngestPage /> : <Navigate to="/" replace />} />
            <Route path="/automation" element={isAdmin ? <AutomationPage /> : <Navigate to="/" replace />} />
            <Route
              path="*"
              element={
                <div className="flex items-center justify-center min-h-[60vh] text-gray-500">
                  <div className="text-center">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">404</h2>
                    <p>페이지를 찾을 수 없습니다.</p>
                  </div>
                </div>
              }
            />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default NexusLayout;
