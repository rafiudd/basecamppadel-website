"use client";

import { useEffect, useEffectEvent, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDownIcon, CloseIcon } from "@/components/ui/icons";

export type SearchOption = { value: string; label: string; hint?: string; disabled?: boolean };

type Pos = { left: number; width: number; top?: number; bottom?: number };

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * A <select> you can type into: the list filters as you type (name and hint). Controlled with
 * `value`/`onChange`, or uncontrolled with `defaultValue`. With `name` the value is posted like a
 * select, and `required` blocks the submit through a hidden input. The list is portalled with fixed
 * positioning so scrolling panels don't clip it.
 */
export function SearchSelect({
  options,
  value,
  defaultValue = "",
  onChange,
  name,
  required,
  disabled,
  placeholder = "Pilih",
  emptyText = "Tidak ada yang cocok",
  className = "",
  "aria-label": ariaLabel,
  "aria-invalid": ariaInvalid,
}: {
  options: SearchOption[];
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyText?: string;
  className?: string;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
}) {
  const [inner, setInner] = useState(defaultValue);
  const current = value ?? inner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const [pos, setPos] = useState<Pos | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const hiddenRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === current);
  const q = fold(query.trim());
  const shown = q ? options.filter((o) => fold(`${o.label} ${o.hint ?? ""}`).includes(q)) : options;

  const firstEnabled = (list: SearchOption[], from = 0) => list.findIndex((o, i) => i >= from && !o.disabled);

  const set = (v: string) => {
    if (value === undefined) setInner(v);
    onChange?.(v);
  };
  const openList = () => {
    if (open) return;
    setQuery("");
    const i = options.findIndex((o) => o.value === current);
    setActive(i >= 0 ? i : firstEnabled(options));
    setOpen(true);
  };
  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const choose = (o: SearchOption) => {
    if (o.disabled) return;
    set(o.value);
    close();
  };
  const move = (dir: 1 | -1) => {
    if (!shown.length) return;
    let i = active;
    for (let n = 0; n < shown.length; n++) {
      i = (i + dir + shown.length) % shown.length;
      if (!shown[i].disabled) return setActive(i);
    }
  };

  // Keep the list under (or above, when there's no room) the input while open.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const r = inputRef.current?.getBoundingClientRect();
      if (!r) return;
      const width = Math.max(r.width, 224);
      const left = Math.max(8, Math.min(r.left, window.innerWidth - width - 8));
      const below = window.innerHeight - r.bottom;
      const up = below < 260 && r.top > below;
      setPos(up ? { left, width, bottom: window.innerHeight - r.top + 4 } : { left, width, top: r.bottom + 4 });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  // Close on a tap/click outside (blur alone is unreliable with touch and a portalled list).
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (!wrapRef.current?.contains(t) && !listRef.current?.contains(t)) close();
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  useEffect(() => {
    if (open) listRef.current?.querySelector(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  // A form reset (also React's automatic reset after a successful action) restores the default.
  const onReset = useEffectEvent(() => {
    if (value === undefined) setInner(defaultValue);
    onChange?.(defaultValue);
  });
  useEffect(() => {
    const form = hiddenRef.current?.form;
    if (!form) return;
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) return openList();
      move(e.key === "ArrowDown" ? 1 : -1);
    } else if (e.key === "Enter") {
      if (!open) return;
      e.preventDefault();
      if (shown[active]) choose(shown[active]);
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        close();
      }
    } else if (e.key === "Tab") {
      close();
    }
  };

  return (
    <div ref={wrapRef} className="relative min-w-0">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={ariaLabel}
        aria-invalid={ariaInvalid}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
        autoComplete="off"
        disabled={disabled}
        placeholder={open && selected ? selected.label : placeholder}
        value={open ? query : (selected?.label ?? "")}
        onFocus={openList}
        onClick={openList}
        onChange={(e) => {
          setQuery(e.target.value);
          const q2 = fold(e.target.value.trim());
          const next = q2 ? options.filter((o) => fold(`${o.label} ${o.hint ?? ""}`).includes(q2)) : options;
          setActive(firstEnabled(next));
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={`${className} w-full ${selected && !disabled ? "pr-14!" : "pr-8!"} truncate placeholder:text-snow/50 ${open && selected ? "placeholder:text-snow/80" : ""}`}
      />
      <span className="absolute right-2 inset-y-0 flex items-center gap-0.5 text-snow/70 pointer-events-none">
        {selected && !disabled && (
          <button
            type="button"
            tabIndex={-1}
            aria-label="Kosongkan pilihan"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              set("");
              close();
            }}
            className="pointer-events-auto w-6 h-6 border-none bg-transparent p-0 flex items-center justify-center text-snow/60 hover:text-snow"
          >
            <CloseIcon size={14} />
          </button>
        )}
        <ChevronDownIcon className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </span>
      {/* Carries the value for the form and the browser's `required` check. */}
      <input
        ref={hiddenRef}
        tabIndex={-1}
        aria-hidden
        name={name}
        required={required}
        disabled={disabled}
        value={current}
        onChange={() => {}}
        onFocus={() => inputRef.current?.focus()}
        className="absolute inset-0 w-full h-full opacity-0 pointer-events-none"
      />
      {open &&
        pos &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            onMouseDown={(e) => e.preventDefault()}
            style={{ left: pos.left, width: pos.width, top: pos.top, bottom: pos.bottom }}
            className="fixed z-60 max-h-64 overflow-y-auto overscroll-contain m-0 p-1 list-none bg-ink-3 border border-snow/12 rounded-lg shadow-pop text-snow"
          >
            {shown.map((o, i) => (
              <li
                key={o.value}
                id={`${listId}-${i}`}
                data-i={i}
                role="option"
                aria-selected={o.value === current}
                aria-disabled={o.disabled}
                onClick={() => choose(o)}
                onMouseMove={() => !o.disabled && active !== i && setActive(i)}
                className={`px-2.5 py-2 rounded-md min-h-10 box-border flex flex-col justify-center ${
                  o.disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"
                } ${i === active ? "bg-snow/10" : ""}`}
              >
                <span className={`text-sm font-semibold truncate ${o.value === current ? "text-volt" : ""}`}>{o.label}</span>
                {o.hint && <span className="text-xs text-snow/60 truncate">{o.hint}</span>}
              </li>
            ))}
            {!shown.length && <li className="px-2.5 py-2 text-sm text-snow/60">{emptyText}</li>}
          </ul>,
          document.body,
        )}
    </div>
  );
}
