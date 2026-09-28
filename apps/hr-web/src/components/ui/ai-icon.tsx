import type { SVGProps } from "react";

/** Shared AI signature; matches the employee app's local vector mark. */
export function AiIcon({
  size = 24,
  ...props
}: SVGProps<SVGSVGElement> & { size?: number | string }) {
  const named = props["aria-label"] || props["aria-labelledby"];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      role={named ? "img" : undefined}
      aria-hidden={named ? undefined : true}
      focusable="false"
      {...props}
    >
      <path
        d="M10.5 3C11.5 8.9 13.1 10.5 19 11.5C13.1 12.5 11.5 14.1 10.5 20C9.5 14.1 7.9 12.5 2 11.5C7.9 10.5 9.5 8.9 10.5 3Z"
        fill="currentColor"
        fillOpacity=".14"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <path
        d="M20 1.5Q20.4 4.6 23.5 5Q20.4 5.4 20 8.5Q19.6 5.4 16.5 5Q19.6 4.6 20 1.5Z"
        fill="currentColor"
      />
      <circle cx="20" cy="19" r="1.3" fill="currentColor" opacity=".7" />
    </svg>
  );
}
