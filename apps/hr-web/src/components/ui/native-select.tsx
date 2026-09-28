import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
// shadcn's native select: accessible, keyboard- and mobile-native.
// className sizes the wrapper (width, height, text size); the select fills it.
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <span
      data-slot="native-select-wrapper"
      className={cn("relative inline-flex h-9 w-full text-sm", className)}
    >
      <select
        data-slot="native-select"
        className={cn(
          "border-input dark:bg-input/30 h-full w-full min-w-0 appearance-none rounded-md border bg-transparent py-0 pr-8 pl-3 text-[length:inherit] shadow-xs outline-none transition-[color,box-shadow] disabled:cursor-not-allowed disabled:opacity-50",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        )}
        {...props}
      />
      <ChevronDown
        aria-hidden
        className="text-muted-foreground pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2"
      />
    </span>
  );
}
export { NativeSelect };
