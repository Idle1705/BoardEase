"use client";

import { useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, MapPin, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { DAVAO_PLACES, type Place } from "@/data/places";
import { formatPeso } from "@/lib/format";
import { PROPERTY_TYPES, PROPERTY_TYPE_LABEL } from "@/lib/listing-types";
import {
  BUDGET_LIMITS,
  DEFAULT_FILTERS,
  RADIUS_LIMITS,
  SORTS,
  SORT_LABEL,
  type Filters,
} from "@/lib/search";
import { cn } from "@/lib/utils";

type SetFilters = (patch: Partial<Filters>) => void;

/** Local draft that resets whenever the committed value changes. */
function useDraft<T>(value: T) {
  const [draft, setDraft] = useState(value);
  const [prev, setPrev] = useState(value);
  if (prev !== value) {
    setPrev(value);
    setDraft(value);
  }
  return [draft, setDraft] as const;
}

/* ---------- Location search (combobox) ---------- */

export function LocationSearch({
  value,
  onPick,
  className,
}: {
  value: string;
  onPick: (p: { label: string; lat: number; lng: number }) => void;
  className?: string;
}) {
  const [text, setText] = useDraft(value);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [remote, setRemote] = useState<Place[] | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);


  const q = text.trim().toLowerCase();
  const local = useMemo(
    () =>
      DAVAO_PLACES.filter(
        (p) => !q || q === value.toLowerCase() || `${p.label} ${p.detail}`.toLowerCase().includes(q),
      ),
    [q, value],
  );
  const options: (Place & { remote?: boolean })[] = remote ? remote.map((r) => ({ ...r, remote: true })) : local;
  const canSearch = q.length >= 2 && q !== value.toLowerCase();

  const choose = (p: Place) => {
    const label = p.detail ? `${p.label}, ${p.detail}` : p.label;
    setText(label);
    setOpen(false);
    setRemote(null);
    onPick({ label, lat: p.lat, lng: p.lng });
    inputRef.current?.blur();
  };

  const runSearch = async () => {
    if (!canSearch) return;
    setStatus("loading");
    setError("");
    try {
      const res = await fetch(`/api/geocode?q=${encodeURIComponent(text.trim())}`);
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Place search failed.");
      setRemote(body.results);
      setActive(0);
      setStatus("idle");
      if (!body.results.length) setError(`No place called “${text.trim()}” found in the Philippines.`);
    } catch (e) {
      setStatus("error");
      setError(e instanceof Error ? e.message : "Place search failed.");
    }
  };

  return (
    <div className={cn("relative", className)}>
      <div className="flex h-12 items-center gap-2 rounded-full bg-white pr-1.5 pl-4 shadow-md ring-1 ring-black/5 focus-within:ring-2 focus-within:ring-brand">
        <Search className="size-[18px] shrink-0 text-subtle" strokeWidth={1.9} />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && options[active] ? `${listId}-${active}` : undefined}
          aria-label="Search near a place"
          placeholder="Search near a school, mall or barangay"
          className="h-full min-w-0 flex-1 bg-transparent text-body text-ink outline-none placeholder:text-subtle focus-visible:outline-none"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setRemote(null);
            setError("");
            setOpen(true);
            setActive(0);
          }}
          onFocus={(e) => {
            e.currentTarget.select();
            setOpen(true);
          }}
          onBlur={() => window.setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setActive((i) => Math.min(i + 1, Math.max(options.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (remote && options[active]) choose(options[active]);
              else if (canSearch && !local.some((p) => p.label.toLowerCase() === q)) runSearch();
              else if (options[active]) choose(options[active]);
            } else if (e.key === "Escape") {
              setOpen(false);
              setText(value);
            }
          }}
        />
        {text && (
          <button
            type="button"
            aria-label="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setText("");
              setRemote(null);
              setOpen(true);
              inputRef.current?.focus();
            }}
            className="grid size-10 shrink-0 place-items-center rounded-full text-subtle hover:bg-surface hover:text-ink"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {open && (
        <div
          className="absolute inset-x-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-lg bg-white p-1.5 shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-150"
          onMouseDown={(e) => e.preventDefault()}
        >
          <ul id={listId} role="listbox" aria-label="Places">
            {options.map((p, i) => (
              <li
                key={p.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(p)}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-2",
                  i === active && "bg-surface",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-surface text-ink-2">
                  <MapPin className="size-4" strokeWidth={1.9} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-body font-medium text-ink">{p.label}</span>
                  <span className="block truncate text-footnote text-subtle">{p.detail}</span>
                </span>
              </li>
            ))}
          </ul>
          {canSearch && !remote && (
            <button
              type="button"
              onClick={runSearch}
              className="mt-1 flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-body hover:bg-surface"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-ink text-white">
                {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
              </span>
              <span className="truncate">
                Search for <span className="font-semibold">“{text.trim()}”</span>
              </span>
            </button>
          )}
          {error && <p className="px-2.5 py-2 text-footnote text-destructive" role="status">{error}</p>}
          {!options.length && !canSearch && !error && (
            <p className="px-2.5 py-2 text-footnote text-subtle">Type a place in Davao City, then press Enter.</p>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------- Shared value controls ---------- */

export function BudgetControl({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useDraft(value);
  const presets = [3000, 5000, 8000, 12000];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-footnote text-subtle">Maximum monthly rent</span>
        <span className="text-callout font-semibold tabular-nums">{formatPeso(draft)}</span>
      </div>
      <Slider
        aria-label="Maximum monthly rent"
        min={BUDGET_LIMITS.min}
        max={BUDGET_LIMITS.max}
        step={BUDGET_LIMITS.step}
        value={[draft]}
        onValueChange={(v) => setDraft(Array.isArray(v) ? v[0] : (v as number))}
        onValueCommitted={(v) => onCommit(Array.isArray(v) ? v[0] : (v as number))}
        className="py-2 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-black/10 [&_[data-slot=slider-thumb]]:shadow-sm [&_[data-slot=slider-track]]:h-1.5"
      />
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <ChoiceChip key={p} active={value === p} onClick={() => onCommit(p)}>
            {formatPeso(p)}
          </ChoiceChip>
        ))}
      </div>
    </div>
  );
}

export function RadiusControl({ value, onCommit }: { value: number; onCommit: (v: number) => void }) {
  const [draft, setDraft] = useDraft(value);
  const presets = [1, 3, 5, 10];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <span className="text-footnote text-subtle">Distance from the search point</span>
        <span className="text-callout font-semibold tabular-nums">{draft} km</span>
      </div>
      <Slider
        aria-label="Maximum distance in kilometres"
        min={RADIUS_LIMITS.min}
        max={RADIUS_LIMITS.max}
        step={RADIUS_LIMITS.step}
        value={[draft]}
        onValueChange={(v) => setDraft(Array.isArray(v) ? v[0] : (v as number))}
        onValueCommitted={(v) => onCommit(Array.isArray(v) ? v[0] : (v as number))}
        className="py-2 [&_[data-slot=slider-thumb]]:size-5 [&_[data-slot=slider-thumb]]:border-black/10 [&_[data-slot=slider-thumb]]:shadow-sm [&_[data-slot=slider-track]]:h-1.5"
      />
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <ChoiceChip key={p} active={value === p} onClick={() => onCommit(p)}>
            {p} km
          </ChoiceChip>
        ))}
      </div>
    </div>
  );
}

export function TypeChoices({ value, onChange }: { value: Filters["type"]; onChange: (v: Filters["type"]) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Room type">
      {(["any", ...PROPERTY_TYPES] as const).map((t) => (
        <ChoiceChip key={t} role="radio" active={value === t} onClick={() => onChange(t)}>
          {t === "any" ? "Any type" : PROPERTY_TYPE_LABEL[t]}
        </ChoiceChip>
      ))}
    </div>
  );
}

export function SortChoices({ value, onChange }: { value: Filters["sort"]; onChange: (v: Filters["sort"]) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Sort listings">
      {SORTS.map((s) => (
        <ChoiceChip key={s} role="radio" active={value === s} onClick={() => onChange(s)}>
          {SORT_LABEL[s]}
        </ChoiceChip>
      ))}
    </div>
  );
}

function ChoiceChip({
  active,
  onClick,
  children,
  role,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  role?: "radio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role ? active : undefined}
      aria-pressed={role ? undefined : active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-footnote font-medium transition-colors duration-150",
        active ? "bg-ink text-white" : "bg-surface text-ink hover:bg-surface-2",
      )}
    >
      {active && <Check className="size-3.5" strokeWidth={2.4} />}
      {children}
    </button>
  );
}

/* ---------- Floating filter chips over the map (tablet and desktop) ---------- */

const chipClass = (changed: boolean) =>
  cn(
    "inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full px-4 text-footnote font-medium shadow-md ring-1 transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-brand",
    changed ? "bg-brand-soft text-brand ring-brand/25 hover:bg-[#dcece6]" : "bg-white text-ink ring-black/5 hover:bg-surface",
  );

export function FilterChips({ filters, set }: { filters: Filters; set: SetFilters }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Popover>
        <PopoverTrigger className={chipClass(filters.budget !== DEFAULT_FILTERS.budget)}>
          Up to {formatPeso(filters.budget)}
          <ChevronDown className="size-3.5 opacity-60" />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="w-80 rounded-lg p-4 shadow-lg">
          <BudgetControl value={filters.budget} onCommit={(budget) => set({ budget })} />
        </PopoverContent>
      </Popover>

      <Popover>
        <PopoverTrigger className={chipClass(filters.radiusKm !== DEFAULT_FILTERS.radiusKm)}>
          Within {filters.radiusKm} km
          <ChevronDown className="size-3.5 opacity-60" />
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={8} className="w-80 rounded-lg p-4 shadow-lg">
          <RadiusControl value={filters.radiusKm} onCommit={(radiusKm) => set({ radiusKm })} />
        </PopoverContent>
      </Popover>

      <DropdownMenu>
        <DropdownMenuTrigger className={chipClass(filters.type !== "any")}>
          {filters.type === "any" ? "Any room type" : PROPERTY_TYPE_LABEL[filters.type]}
          <ChevronDown className="size-3.5 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" sideOffset={8} className="w-52 rounded-lg p-1.5 shadow-lg">
          <DropdownMenuRadioGroup value={filters.type} onValueChange={(v) => set({ type: v as Filters["type"] })}>
            <DropdownMenuRadioItem value="any" className="h-9 rounded-md text-body">Any room type</DropdownMenuRadioItem>
            {PROPERTY_TYPES.map((t) => (
              <DropdownMenuRadioItem key={t} value={t} className="h-9 rounded-md text-body">
                {PROPERTY_TYPE_LABEL[t]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SortMenu({ value, onChange, className }: { value: Filters["sort"]; onChange: (v: Filters["sort"]) => void; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "inline-flex h-10 shrink-0 items-center gap-1 rounded-md px-2.5 text-footnote font-medium whitespace-nowrap text-ink-2 transition-colors hover:bg-surface hover:text-ink",
          className,
        )}
      >
        {SORT_LABEL[value]}
        <ChevronDown className="size-3.5 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-44 rounded-lg p-1.5 shadow-lg">
        <DropdownMenuRadioGroup value={value} onValueChange={(v) => onChange(v as Filters["sort"])}>
          {SORTS.map((s) => (
            <DropdownMenuRadioItem key={s} value={s} className="h-9 rounded-md text-body">
              {SORT_LABEL[s]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
