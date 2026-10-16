export type StatusVariant = "info" | "success" | "error";

interface Props {
  text: string;
  variant?: StatusVariant;
  onClose?: () => void;
}

export function StatusBanner({ text, variant = "info", onClose }: Props) {
  return (
    <div className={`status-banner status-${variant}`} role="status">
      <span className="status-text">{text}</span>
      {onClose && (
        <button
          className="status-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>
      )}
    </div>
  );
}
