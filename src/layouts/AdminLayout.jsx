import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/sidebar/Sidebar';
import { Navbar } from '../components/navbar/Navbar';
import { DemoBar } from '../components/common/DemoBar';
import { Toast } from '../components/common/Toast';
import { useApp } from '../context/AppContext';

export const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isSidebarCollapsed, toggleSidebarCollapse } = useApp();

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex flex-col">
      <div className="flex-1 flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
          <DemoBar />
          <Navbar 
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
            onToggleCollapse={toggleSidebarCollapse}
            isCollapsed={isSidebarCollapsed}
            title="WorkTrack Enterprise Administration" 
          />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-fade-in">
            <Outlet />
          </main>
        </div>
      </div>
      <Toast />
    </div>
  );
};
