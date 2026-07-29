import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import Header from './Header.jsx';

function AuthenticatedLayout() {
  return (
    <div className="flex min-h-screen bg-dn-bg-base">
      <Sidebar />

      <div className="flex flex-1 flex-col ml-[96px] transition-[margin] duration-250 min-w-0">
        <Header />
        
        <main className="flex-1 mt-[56px] p-6 bg-dn-bg-primary overflow-x-hidden">
          <div className="mx-auto w-full max-w-[1400px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default AuthenticatedLayout;
