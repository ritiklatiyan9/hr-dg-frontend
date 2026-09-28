import * as React from "react";
import { cn } from "@/lib/utils";
// ponytail: native checkbox with role=switch; swap for @radix-ui/react-switch if needed.
function Switch({
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type">) {
  return (
    <input
      type="checkbox"
      role="switch"
      data-slot="switch"
      className={cn(
        "peer relative inline-flex h-[1.15rem] w-8 shrink-0 cursor-pointer appearance-none items-center rounded-full border border-transparent bg-input shadow-xs outline-none transition-all",
        "before:bg-background before:pointer-events-none before:block before:size-4 before:rounded-full before:transition-transform before:content-['']",
        "checked:bg-primary checked:before:translate-x-[calc(100%-2px)]",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}
export { Switch };
