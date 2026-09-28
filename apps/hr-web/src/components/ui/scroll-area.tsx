import * as React from "react";
import { cn } from "@/lib/utils";
// ponytail: native scrolling; add @radix-ui/react-scroll-area only if custom scrollbars are required.
function ScrollArea({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="scroll-area"
      className={cn("relative overflow-y-auto overscroll-contain", className)}
      {...props}
    />
  );
}
export { ScrollArea };
