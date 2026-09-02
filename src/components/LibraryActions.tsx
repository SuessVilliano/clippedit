"use client";

import { useEffect, useState } from "react";
import {
  hasLibraryItem,
  subscribeLibraryChanged,
  toggleLibraryItem,
  type LibraryItem
} from "@/lib/library";

type ItemInput = Omit<LibraryItem, "bucket" | "createdAt">;

export function LibraryActions({ item }: { item: ItemInput }) {
  const [favorite, setFavorite] = useState(false);
  const [later, setLater] = useState(false);

  function sync() {
    setFavorite(hasLibraryItem(item.id, "favorite"));
    setLater(hasLibraryItem(item.id, "later"));
  }

  useEffect(() => {
    sync();
    return subscribeLibraryChanged(sync);
  }, [item.id]);

  return (
    <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
      <button
        type="button"
        className="btn"
        aria-pressed={favorite}
        title={favorite ? "Remove from favorites" : "Favorite"}
        onClick={() => {
          toggleLibraryItem(item, "favorite");
          sync();
        }}
        style={favorite ? { borderColor: "rgba(244,114,182,.6)" } : undefined}
      >
        {favorite ? "★ Favorited" : "☆ Favorite"}
      </button>
      <button
        type="button"
        className="btn"
        aria-pressed={later}
        title={later ? "Remove from Save for Later" : "Save for later"}
        onClick={() => {
          toggleLibraryItem(item, "later");
          sync();
        }}
        style={later ? { borderColor: "rgba(56,189,248,.6)" } : undefined}
      >
        {later ? "✓ Saved" : "+ Later"}
      </button>
    </div>
  );
}
