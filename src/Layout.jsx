import React, { useState } from "react";
import Sidebar from "./components/layout/Sidebar";
import TopBar from "./components/layout/TopBar";
import { cn } from "@/lib/utils";

const pageTitles = {
  Dashboard: "Dashboard",
  Projects: "Projects",
  Plans: "Plans",
  Tasks: "Tasks",
  Personnel: "Personnel",
  Tools: "Tools & Equipment",
  Stock: "Stock Management",
  Articles: "Articles",
  Finance: "Finance",
  Expenses: "Expenses",
  Documents: "Documents",
  NonConformities: "Non Conformities",
  Communication: "Communication",
  Reporting: "Reporting",
  Administration: "Administration",
};

export default function Layout({ children, currentPageName }) {
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar
        currentPage={currentPageName}
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
      />
      <div className={cn(
        "flex-1 flex flex-col min-h-screen transition-all duration-300",
        collapsed ? "lg:ml-[68px]" : "lg:ml-[260px]"
      )}>
        <TopBar
          onToggleSidebar={() => setCollapsed(!collapsed)}
          pageTitle={pageTitles[currentPageName] || currentPageName}
        />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}