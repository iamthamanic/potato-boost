/**
 * UiIcon — shared stroke SVG set for actions and nav.
 * Location: apps/dashboard/src/ui-icon.tsx
 */
export type UiIconName =
  | "close"
  | "settings"
  | "back"
  | "forward"
  | "plus"
  | "check";

type IconMark = {
  viewBox: string;
  paths?: readonly string[];
  circles?: readonly { cx: number; cy: number; r: number }[];
};

const ICONS: Record<UiIconName, IconMark> = {
  close: {
    viewBox: "0 0 16 16",
    paths: ["M3.2 3.2 12.8 12.8M12.8 3.2 3.2 12.8"],
  },
  back: {
    viewBox: "0 0 16 16",
    paths: ["M10 3.2 4.8 8 10 12.8"],
  },
  forward: {
    viewBox: "0 0 16 16",
    paths: ["M6 3.2 11.2 8 6 12.8"],
  },
  plus: {
    viewBox: "0 0 16 16",
    paths: ["M8 3.2v9.6M3.2 8h9.6"],
  },
  check: {
    viewBox: "0 0 16 16",
    paths: ["M3.2 8.2 6.4 11.4 12.8 4.6"],
  },
  settings: {
    viewBox: "0 0 24 24",
    paths: ["M3 7h10M11 17h10"],
    circles: [
      { cx: 16, cy: 7, r: 3 },
      { cx: 8, cy: 17, r: 3 },
    ],
  },
};

type UiIconProps = {
  name: UiIconName;
};

export function UiIcon({ name }: UiIconProps) {
  const mark = ICONS[name];
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox={mark.viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {mark.paths?.map((path) => (
        <path key={path} d={path} />
      ))}
      {mark.circles?.map((circle) => (
        <circle
          key={`${circle.cx}-${circle.cy}-${circle.r}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
        />
      ))}
    </svg>
  );
}
