import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Search, User, Phone, X, Loader2 } from "lucide-react";
import { getAuthHeaders } from "@/lib/auth-context";

export interface CustomerSearchResult {
  id: string;
  name: string;
  phone: string;
  addresses?: Array<{ label: string; address: string }>;
  notes?: string;
}

interface CustomerSearchProps {
  placeholder?: string;
  onSelect: (customer: CustomerSearchResult) => void;
  className?: string;
  autoFocus?: boolean;
  testId?: string;
}

export function CustomerSearch({
  placeholder = "Mijoz qidirish (ism, telefon)...",
  onSelect,
  className,
  autoFocus,
  testId = "customer-search",
}: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CustomerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const runSearch = useCallback(async (q: string) => {
    if (!q || q.trim().length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setLoading(true);
    try {
      const res = await fetch(`/api/customers?search=${encodeURIComponent(q.trim())}&page=1&limit=10`, {
        headers: getAuthHeaders(),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      setResults(Array.isArray(data?.customers) ? data.customers : []);
      setOpen(true);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(val), 250);
  };

  const handlePick = (c: CustomerSearchResult) => {
    onSelect(c);
    setQuery("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative ${className || ""}`}>
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className="h-9 pl-8 pr-8 text-sm bg-white"
          autoFocus={autoFocus}
          data-testid={`input-${testId}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            data-testid={`button-${testId}-clear`}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
          </button>
        )}
      </div>
      {open && (
        <div className="absolute z-50 mt-1 left-0 right-0 max-h-64 overflow-y-auto rounded-md border bg-white shadow-lg" data-testid={`list-${testId}-results`}>
          {results.length === 0 ? (
            <div className="px-3 py-3 text-xs text-muted-foreground text-center">
              {query.trim().length < 2 ? "Kamida 2 ta belgi kiriting" : "Mijoz topilmadi"}
            </div>
          ) : (
            results.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => handlePick(c)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b last:border-b-0 flex items-start gap-2"
                data-testid={`button-${testId}-pick-${c.id}`}
              >
                <div className="w-7 h-7 rounded-full bg-indigo-500 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                  {(c.name || "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate flex items-center gap-1.5">
                    <User className="h-3 w-3 text-muted-foreground" />
                    {c.name || "Nomsiz"}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3 w-3" />
                    {c.phone || "—"}
                  </div>
                  {c.addresses && c.addresses[0]?.address && (
                    <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                      {c.addresses[0].address}
                    </div>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
