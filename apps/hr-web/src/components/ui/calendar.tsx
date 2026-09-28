import * as React from "react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * shadcn calendar on DayPicker. Cells reset padding/borders explicitly because
 * the legacy global `th`/`td` table styles would otherwise stretch the grid.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const d = getDefaultClassNames();
  const cell = "size-9 border-0 bg-transparent p-0 text-center";
  const nav =
    "text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-8 min-h-0 items-center justify-center rounded-md border-0 bg-transparent p-0 disabled:opacity-40";
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("bg-popover p-3", className)}
      components={{
        Chevron: ({ orientation, ...rest }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" {...rest} />
          ) : (
            <ChevronRight className="size-4" {...rest} />
          ),
      }}
      classNames={{
        root: cn(d.root, "w-fit"),
        months: cn(d.months, "relative flex flex-col"),
        month: cn(d.month, "flex flex-col gap-3"),
        month_caption: cn(d.month_caption, "flex h-8 items-center justify-center"),
        caption_label: cn(d.caption_label, "text-sm font-semibold"),
        nav: cn(d.nav, "absolute inset-x-0 top-0 flex h-8 items-center justify-between"),
        button_previous: cn(d.button_previous, nav),
        button_next: cn(d.button_next, nav),
        month_grid: cn(d.month_grid, "w-auto border-collapse whitespace-normal"),
        weekdays: cn(d.weekdays),
        weekday: cn(
          d.weekday,
          cell,
          "static h-8 text-[11px] font-medium normal-case tracking-normal text-muted-foreground",
        ),
        week: cn(d.week, "hover:bg-transparent"),
        day: cn(d.day, cell, "text-sm text-foreground"),
        day_button: cn(
          d.day_button,
          "hover:bg-accent focus-visible:ring-ring inline-flex size-9 min-h-0 items-center justify-center rounded-md border-0 bg-transparent p-0 font-normal tabular-nums outline-none focus-visible:ring-2",
        ),
        selected: cn(
          d.selected,
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:font-semibold",
        ),
        today: cn(d.today, "[&>button]:ring-1 [&>button]:ring-primary/50 [&>button]:font-semibold"),
        outside: cn(d.outside, "text-muted-foreground/45"),
        disabled: cn(d.disabled, "pointer-events-none text-muted-foreground/30"),
        hidden: cn(d.hidden, "invisible"),
        ...classNames,
      }}
      {...props}
    />
  );
}

export { Calendar };
