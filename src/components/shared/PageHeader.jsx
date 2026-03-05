import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus } from "lucide-react";

export default function PageHeader({ title, subtitle, onAdd, addLabel, searchValue, onSearch, children }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        {onSearch && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={searchValue || ""}
              onChange={(e) => onSearch(e.target.value)}
              className="pl-9 w-48 bg-card"
            />
          </div>
        )}
        {children}
        {onAdd && (
          <Button onClick={onAdd} className="bg-primary hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            {addLabel || "Add New"}
          </Button>
        )}
      </div>
    </div>
  );
}