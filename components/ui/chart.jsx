"use client";

import React from "react";
import { cn } from "@/lib/utils";

export function ChartContainer({ className, children, ...props }) {
  return (
    <div
      className={cn(
        "rounded-md border bg-white p-4 dark:bg-zinc-900 dark:border-zinc-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
