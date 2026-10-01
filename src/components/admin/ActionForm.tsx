"use client";

import { useActionState } from "react";
import type { ActionState } from "@/app/admin/events/actions";

/** <form> bound to a server action that returns `{ error }`; shows the error inline. */
export function ActionForm({
  action,
  children,
  className,
  confirmText,
}: {
  action: (state: ActionState, fd: FormData) => Promise<ActionState>;
  children: React.ReactNode;
  className?: string;
  confirmText?: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form
      action={formAction}
      className={className}
      onSubmit={confirmText ? (e) => !window.confirm(confirmText) && e.preventDefault() : undefined}
    >
      <fieldset disabled={pending} className="contents">
        {children}
      </fieldset>
      {state?.error && (
        <div role="alert" className="basis-full w-full text-sm text-loss bg-loss/15 rounded-lg px-3 py-2">
          {state.error}
        </div>
      )}
    </form>
  );
}
