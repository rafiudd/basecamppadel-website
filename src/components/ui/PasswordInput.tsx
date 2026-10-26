"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/ui/icons";

export function PasswordInput({
  name = "password",
  required,
  minLength = 6,
  placeholder,
  autoComplete,
  className = "field",
}: {
  name?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  autoComplete?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative flex items-center">
      <input
        className={`${className} pr-10`}
        name={name}
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        tabIndex={-1}
        aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-snow/50 hover:text-snow bg-transparent border-none rounded-md transition-colors flex items-center justify-center cursor-pointer"
      >
        {show ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
      </button>
    </div>
  );
}
