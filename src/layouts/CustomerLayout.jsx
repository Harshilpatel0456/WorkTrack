import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '../components/sidebar/Sidebar';
import { Navbar } from '../components/navbar/Navbar';
import { DemoBar } from '../components/common/DemoBar';
import { Toast } from '../components/common/Toast';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';

export const CustomerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { selectedCustomerId } = useAuth();
  const { customers, isSidebarCollapsed, toggleSidebarCollapse } = useApp();

  const currentCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

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
            title={`Customer Portal • ${currentCustomer?.companyName || 'Client'}`} 
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
