import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function SearchableSelect({ items, onSelect, onQuickCreate, placeholder }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = items.filter(i => i.label?.toLowerCase().includes(query.toLowerCase())).slice(0, 8);
  const noMatch = query && filtered.length === 0;

  return (
    <div ref={ref} className="relative">
      <Input
        placeholder={placeholder}
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
      />
      {open && (query || items.length > 0) && (
        <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.map(item => (
            <button
              key={item.id}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              onClick={() => { onSelect(item); setQuery(""); setOpen(false); }}
            >
              {item.label}
            </button>
          ))}
          {noMatch && onQuickCreate && (
            <button
              className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/5 flex items-center gap-2"
              onClick={() => { onQuickCreate(query); setQuery(""); setOpen(false); }}
            >
              <Plus className="w-3 h-3" /> Create "{query}"
            </button>
          )}
          {!query && items.length === 0 && (
            <div className="px-3 py-2 text-sm text-muted-foreground">No items available</div>
          )}
        </div>
      )}
    </div>
  );
}