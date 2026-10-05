/** Muted card for "nothing here yet" messages, with an optional action below. */
export function EmptyState({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-ink-3 rounded-card px-5 py-8 flex flex-col items-center text-center gap-3">
      <div className="text-sm text-snow/70 max-w-115">{children}</div>
      {action}
    </div>
  );
}
