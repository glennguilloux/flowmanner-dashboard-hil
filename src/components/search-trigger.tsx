"use client";

import { useState, useEffect } from "react";
import { SearchDialog } from "@/components/search-dialog";

export function SearchTrigger() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Cmd+K / Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
        return;
      }

      // Escape to close
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return <SearchDialog open={open} onClose={() => setOpen(false)} />;
}
