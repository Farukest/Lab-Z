"use client";

import type { Category } from "@/lib/types";

const categories: { id: Category | "all"; name: string; icon?: string }[] = [
  { id: "all", name: "all" },
  { id: "basics", name: "basics", icon: "📦" },
  { id: "encryption", name: "encryption", icon: "🔐" },
  { id: "decryption", name: "decryption", icon: "🔓" },
  { id: "acl", name: "acl", icon: "🛡️" },
  { id: "handles", name: "handles", icon: "🔗" },
  { id: "input-proofs", name: "input-proofs", icon: "🔏" },
  { id: "antipatterns", name: "antipatterns", icon: "⚠️" },
  { id: "security", name: "security", icon: "🔒" },
  { id: "openzeppelin", name: "openzeppelin", icon: "🏛️" },
  { id: "advanced", name: "advanced", icon: "🚀" },
];

interface CategoryTabsProps {
  selected: Category | "all";
  onChange: (category: Category | "all") => void;
}

export function CategoryTabs({ selected, onChange }: CategoryTabsProps) {
  return (
    <div className="tabs" style={{ justifyContent: 'center' }}>
      {categories.map((category) => (
        <button
          key={category.id}
          onClick={() => onChange(category.id)}
          className={selected === category.id ? "tab active" : "tab"}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
