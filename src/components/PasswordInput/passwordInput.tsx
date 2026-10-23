import { useState, type ComponentProps } from "react";
import "./passwordInput.css";

interface PasswordInputProps extends Omit<ComponentProps<"input">, "type"> {
  id: string;
  visibilityLabel?: string;
}

export default function PasswordInput({
  id,
  visibilityLabel = "senha",
  disabled,
  readOnly,
  className = "",
  ...inputProps
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);
  const showing = visible && !disabled;
  const toggleLabel = `${showing ? "Ocultar" : "Exibir"} ${visibilityLabel}`;

  return (
    <span
      className="password-input"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setVisible(false);
      }}
    >
      <input
        {...inputProps}
        id={id}
        type={showing ? "text" : "password"}
        className={`password-input-control ${className}`.trim()}
        disabled={disabled}
        readOnly={readOnly}
      />
      <button
        type="button"
        className="password-input-toggle"
        aria-label={toggleLabel}
        aria-controls={id}
        aria-pressed={showing}
        title={toggleLabel}
        disabled={disabled}
        onClick={() => setVisible((previous) => !previous)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {showing && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </span>
  );
}
