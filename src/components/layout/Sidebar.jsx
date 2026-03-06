import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  LayoutDashboard, FolderKanban, Map, CheckSquare, Users, Wrench, Package,
  ShoppingCart, DollarSign, Receipt, FileText, AlertTriangle, MessageSquare,
  BarChart3, Settings, ChevronDown, ChevronRight, HardHat, Menu, X,
  Truck, Building2, Paperclip
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", icon: LayoutDashboard, page: "Dashboard" },
  { name: "Projects", icon: FolderKanban, page: "Projects" },
  { name: "Plans", icon: Map, page: "Plans" },
  { name: "Tasks", icon: CheckSquare, page: "Tasks" },
  {
    name: "Resources", icon: Users, children: [
      { name: "Personnel", icon: Users, page: "Personnel" },
      { name: "Tools", icon: Wrench, page: "Tools" },
      { name: "Subcontractors", icon: Building2, page: "Subcontractors" },
    ]
  },
  {
    name: "Warehouse", icon: Package, children: [
      { name: "Articles", icon: ShoppingCart, page: "Articles" },
      { name: "Stock", icon: Package, page: "Stock" },
      { name: "Reception", icon: Truck, page: "Reception" },
    ]
  },
  {
    name: "Finance", icon: DollarSign, children: [
      { name: "Finance", icon: DollarSign, page: "Finance" },
      { name: "Expenses", icon: Receipt, page: "Expenses" },
      { name: "Invoices", icon: FileText, page: "Invoices" },
    ]
  },
  { name: "Documents", icon: FileText, page: "Documents" },
  { name: "Non Conformities", icon: AlertTriangle, page: "NonConformities" },
  { name: "Attachments", icon: Paperclip, page: "Attachments" },
  { name: "Communication", icon: MessageSquare, page: "Communication" },
  { name: "Reporting", icon: BarChart3, page: "Reporting" },
  { name: "Administration", icon: Settings, page: "Administration" },
];

export default function Sidebar({ currentPage, collapsed, onToggle }) {
  const [expandedGroups, setExpandedGroups] = useState(["Resources"]);

  const toggleGroup = (name) => {
    setExpandedGroups(prev =>
      prev.includes(name) ? prev.filter(g => g !== name) : [...prev, name]
    );
  };

  const isActive = (item) => {
    if (item.page) return currentPage === item.page;
    if (item.children) return item.children.some(c => currentPage === c.page);
    return false;
  };

  return (
    <>
      {/* Mobile overlay */}
      {!collapsed && (
        <div className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden" onClick={onToggle} />
      )}
      
      <aside className={cn(
        "fixed top-0 left-0 h-full z-50 flex flex-col transition-all duration-300 ease-in-out",
        "bg-sidebar text-sidebar-foreground",
        collapsed ? "-translate-x-full lg:translate-x-0 lg:w-[68px]" : "w-[260px] translate-x-0"
      )}>
        {/* Logo */}
        <div className="h-16 flex items-center px-5 gap-3 border-b border-sidebar-muted/50 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sidebar-accent flex items-center justify-center shrink-0">
            <HardHat className="w-5 h-5 text-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-lg tracking-tight">WAPE</span>}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5">
          {navItems.map((item) => {
            if (item.children) {
              const groupExpanded = expandedGroups.includes(item.name);
              const groupActive = isActive(item);
              return (
                <div key={item.name}>
                  <button
                    onClick={() => collapsed ? null : toggleGroup(item.name)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      groupActive ? "bg-sidebar-muted text-sidebar-foreground" : "text-sidebar-foreground/70 hover:bg-sidebar-muted/50 hover:text-sidebar-foreground"
                    )}
                  >
                    <item.icon className="w-[18px] h-[18px] shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1 text-left">{item.name}</span>
                        {groupExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </>
                    )}
                  </button>
                  {!collapsed && groupExpanded && (
                    <div className="ml-4 pl-4 border-l border-sidebar-muted/50 mt-0.5 space-y-0.5">
                      {item.children.map(child => (
                        <Link
                          key={child.page}
                          to={createPageUrl(child.page)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                            currentPage === child.page
                              ? "bg-sidebar-accent text-primary-foreground font-medium"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-muted/50 hover:text-sidebar-foreground"
                          )}
                        >
                          <child.icon className="w-4 h-4 shrink-0" />
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.page}
                to={createPageUrl(item.page)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  currentPage === item.page
                    ? "bg-sidebar-accent text-primary-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-muted/50 hover:text-sidebar-foreground"
                )}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="w-[18px] h-[18px] shrink-0" />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}