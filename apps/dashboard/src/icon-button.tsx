/**
 * IconButton — square icon-only control with an accessible name.
 * Use for page dismiss/close. Location: apps/dashboard/src/icon-button.tsx
 */
import { Link } from "react-router-dom";
import { UiIcon, type UiIconName } from "./ui-icon.js";

type IconButtonProps = {
  label: string;
  icon: UiIconName;
  to?: string;
  onClick?: () => void;
  disabled?: boolean;
};

export function IconButton({
  label,
  icon,
  to,
  onClick,
  disabled,
}: IconButtonProps) {
  const glyph = <UiIcon name={icon} />;

  if (to !== undefined) {
    return (
      <Link className="icon-button" to={to} aria-label={label} title={label}>
        {glyph}
      </Link>
    );
  }

  return (
    <button
      className="icon-button"
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
    >
      {glyph}
    </button>
  );
}
