"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";

export function GlobalSearch() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleSearch = (term: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (term) {
      params.set("q", term);
    } else {
      params.delete("q");
    }
    
    router.replace(`${pathname}?${params.toString()}`);
  };

  let placeholder = "Search...";
  if (pathname.includes("product")) {
    placeholder = "Search products by name or SKU...";
  } else if (pathname.includes("customer")) {
    placeholder = "Search customers...";
  } else if (pathname.includes("ticket")) {
    placeholder = "Search tickets...";
  }

  return (
    <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2 w-full max-w-md transition-all focus-within:ring-2 focus-within:ring-blue-500/50">
      <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
      <input
        type="text"
        placeholder={placeholder}
        defaultValue={searchParams.get("q")?.toString()}
        onChange={(e) => handleSearch(e.target.value)}
        className="bg-transparent border-none outline-none w-full text-sm focus:ring-0 text-slate-700 placeholder:text-slate-400"
      />
    </div>
  );
}