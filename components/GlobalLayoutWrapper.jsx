'use client';

import { usePathname } from 'next/navigation';
import { AppSidebar } from "./app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "./ui/sidebar";
import { Separator } from "./ui/separator";

export function GlobalLayoutWrapper({ children }) {
  const pathname = usePathname();
  
  // If we are on the new CRM Pulse interface, don't render the old sidebar
  if (pathname && pathname.startsWith('/crm')) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-12 items-center gap-2 px-4 border-b bg-white">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <h1 className="text-2xl font-semibold text-gray-800 font-league-spartan">Pinova.</h1>
        </header>
        <main className="min-h-screen bg-gray-50 p-4">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
