import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

export default function DataTable({ columns, data, isLoading, onRowClick, emptyMessage = "No data found" }) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              {columns.map((col, i) => (
                <TableHead key={i} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array(5).fill(0).map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            {columns.map((col, i) => (
              <TableHead key={i} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {col.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row, i) => (
              <TableRow
                key={row.id || i}
                className={onRowClick ? "cursor-pointer hover:bg-muted/30" : ""}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((col, j) => (
                  <TableCell key={j} className="text-sm">
                    {col.cell ? col.cell(row) : row[col.accessor]}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}