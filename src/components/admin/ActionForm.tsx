"use client";

import { useActionState, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { ActionState } from "@/lib/actionState";

/**
 * <form> bound to a server action that returns `{ error }`; shows the error inline. With
 * `confirmText` the submit first asks in a dialog (`danger` styles it as a delete).
 */
export function ActionForm({
  action,
  children,
  className,
  confirmText,
  confirmLabel,
  danger,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
  confirmLabel?: string;
  danger?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const [asking, setAsking] = useState(false);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirmText || confirmed.current) {
      confirmed.current = false;
      return;
    }
    e.preventDefault();
    setAsking(true);
  };
  const proceed = () => {
    setAsking(false);
    confirmed.current = true;
    formRef.current?.requestSubmit();
  };

  return (
    <form ref={formRef} action={formAction} className={className} onSubmit={onSubmit}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.error && (
        <div role="alert" className="basis-full w-full text-sm text-loss bg-loss/15 rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}
      {asking && confirmText && (
        <ConfirmDialog message={confirmText} confirmLabel={confirmLabel} danger={danger} onConfirm={proceed} onCancel={() => setAsking(false)} />
      )}
    </form>
  );
}
