"use client";

import { useState } from "react";
import { Star } from "lucide-react";

interface Props {
  startupId: string;
  initialFavorited: boolean;
  onToggle?: (favorited: boolean) => void;
}

export function FavoriteButton({ startupId, initialFavorited, onToggle }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (loading) return;
    setLoading(true);

    const optimistic = !favorited;
    setFavorited(optimistic);

    try {
      const res = await fetch("/api/startups/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startupId }),
      });

      if (!res.ok) {
        setFavorited(!optimistic);
        return;
      }

      const data = (await res.json()) as { favorited: boolean };
      setFavorited(data.favorited);
      onToggle?.(data.favorited);
    } catch {
      setFavorited(!optimistic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className={`flex-shrink-0 rounded-lg p-1.5 transition-all ${
        favorited
          ? "text-amber-500 hover:text-amber-600"
          : "text-gray-300 hover:text-amber-400 dark:text-gray-600 dark:hover:text-amber-400"
      }`}
      title={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
    >
      <Star
        size={18}
        className={favorited ? "fill-current" : ""}
      />
    </button>
  );
}
