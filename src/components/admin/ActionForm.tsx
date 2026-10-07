"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { toast } from "@/components/ui/Toast";
import { isRedirect, UNEXPECTED_ERROR } from "@/lib/actionState";
import type { ActionState } from "@/lib/actionState";

/**
 * <form> bound to a server action that returns `{ error }`. While it runs, the button that
 * submitted it shows a spinner; then a toast reports the result (`successText`, or `false` for none;
 * an action that redirects counts as a success). With `confirmText` the submit first asks in a
 * dialog (`danger` styles it as a delete).
 */
export function ActionForm({
  action,
  children,
  className,
  confirmText,
  confirmLabel,
  danger,
  successText,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
  confirmLabel?: string;
  danger?: boolean;
  successText?: string | false;
}) {
  const success = successText ?? (danger ? "Berhasil dihapus" : "Berhasil disimpan");
  const [, formAction, pending] = useActionState(async (state: ActionState, fd: FormData): Promise<ActionState> => {
    let res: ActionState;
    try {
      res = await action(state, fd);
    } catch (e) {
      if (isRedirect(e)) {
        if (success) toast.success(success);
        throw e;
      }
      res = { error: UNEXPECTED_ERROR };
    }
    if (res?.error) toast.error(res.error);
    else if (success) toast.success(success);
    return res;
  }, null);
  const formRef = useRef<HTMLFormElement>(null);
  const submitter = useRef<HTMLElement | null>(null);
  const confirmed = useRef(false);
  const [asking, setAsking] = useState(false);

  // Spinner on the button that submitted (or the form's first submit button, for Enter in a field).
  useEffect(() => {
    const btn = submitter.current ?? formRef.current?.querySelector<HTMLElement>('button[type="submit"], button:not([type])');
    if (!btn) return;
    if (pending) btn.setAttribute("data-loading", "");
    else btn.removeAttribute("data-loading");
  }, [pending]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!confirmText || confirmed.current) {
      confirmed.current = false;
      submitter.current = (e.nativeEvent as SubmitEvent).submitter ?? submitter.current;
      return;
    }
    e.preventDefault();
    submitter.current = (e.nativeEvent as SubmitEvent).submitter;
    setAsking(true);
  };
  const proceed = () => {
    setAsking(false);
    confirmed.current = true;
    const btn = submitter.current;
    formRef.current?.requestSubmit(btn && formRef.current.contains(btn) ? btn : undefined);
  };

  return (
    <form ref={formRef} action={formAction} className={className} onSubmit={onSubmit}>
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {asking && confirmText && (
        <ConfirmDialog message={confirmText} confirmLabel={confirmLabel} danger={danger} onConfirm={proceed} onCancel={() => setAsking(false)} />
      )}
    </form>
  );
}
