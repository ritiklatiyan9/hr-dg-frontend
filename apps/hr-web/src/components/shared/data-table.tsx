import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFn,
  type SortingState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  Columns3,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { FacetedFilter, type FilterOption } from "./faceted-filter";

/** A faceted filter on one column; the column's value must be one of `options`. */
export type TableFilter = {
  column: string;
  title: string;
  options: FilterOption[];
};
const inSet: FilterFn<any> = (row, id, value: string[]) =>
  !value?.length || value.includes(String(row.getValue(id)));
const containsText: FilterFn<any> = (row, id, value: string) =>
  String(row.getValue(id) ?? "")
    .toLowerCase()
    .includes(String(value).trim().toLowerCase());
const interactive = "button,a,input,select,textarea,label,[role=menuitem]";

/** shadcn data table. Search, filters, sorting and paging apply to the records
 * loaded from the server; cursor-backed lists pass `serverPaged` and page
 * themselves. Sort and page live in the URL; search text stays in memory. */
export function DataTable<T>({
  data,
  columns,
  getRowId,
  serverPaged = false,
  label = "Records",
  selection = false,
  search = !serverPaged,
  filters = [],
  toolbar,
  actions,
  onRowClick,
  empty,
  hidden = [],
  pageSize: initialPageSize = 20,
  columnFilters: controlledFilters,
  onColumnFiltersChange,
}: {
  data: T[];
  columns: ColumnDef<T, any>[];
  getRowId: (row: T) => string;
  serverPaged?: boolean;
  label?: string;
  selection?: boolean;
  /** Search placeholder, or false to hide the search box. */
  search?: string | boolean;
  filters?: TableFilter[];
  /** Extra filter controls, shown after the faceted filters. */
  toolbar?: ReactNode;
  /** Buttons shown at the right of the toolbar, before the column menu. */
  actions?: ReactNode;
  onRowClick?: (row: T) => void;
  empty?: ReactNode;
  /** Filter-only column ids: hidden and absent from the column menu. */
  hidden?: string[];
  pageSize?: number;
  /** Controlled filters, for KPI cards or links that apply a filter. */
  columnFilters?: ColumnFiltersState;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
}) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [ownFilters, setOwnFilters] = useState<ColumnFiltersState>([]);
  const columnFilters = controlledFilters ?? ownFilters;
  const setColumnFilters = (
    update:
      ColumnFiltersState | ((old: ColumnFiltersState) => ColumnFiltersState),
  ) => {
    const next = typeof update === "function" ? update(columnFilters) : update;
    setOwnFilters(next);
    onColumnFiltersChange?.(next);
  };
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(
    () => Object.fromEntries(hidden.map((id) => [id, false])),
  );
  const [pageSize, setPageSize] = useState(initialPageSize);
  const requestedPage = Number(params.get("page") ?? 1);
  const pageIndex =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage - 1
      : 0;
  const sortValue = params.get("sort");
  const sorting = useMemo<SortingState>(() => {
    const [id, direction] = (sortValue ?? "").split(":");
    return id ? [{ id, desc: direction === "desc" }] : [];
  }, [sortValue]);
  const setPage = (index: number, replace = false) =>
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        if (index) n.set("page", String(index + 1));
        else n.delete("page");
        return n;
      },
      { replace },
    );
  const firstPage = () => {
    if (params.has("page")) setPage(0, true);
  };
  const table = useReactTable({
    data,
    columns,
    getRowId,
    state: {
      sorting,
      globalFilter: query,
      columnFilters,
      columnVisibility,
      ...(!serverPaged ? { pagination: { pageIndex, pageSize } } : {}),
    },
    defaultColumn: { filterFn: inSet },
    globalFilterFn: containsText,
    getColumnCanGlobalFilter: (c) => !!c.accessorFn,
    onSortingChange: (update) => {
      // Read the live hash URL: a quick second click can land before React
      // has re-rendered with the first click's sort.
      const n = new URLSearchParams(location.hash.split("?")[1] ?? "");
      const [id, direction] = (n.get("sort") ?? "").split(":");
      const live: SortingState = id ? [{ id, desc: direction === "desc" }] : [];
      const next = typeof update === "function" ? update(live) : update;
      if (next[0])
        n.set("sort", `${next[0].id}:${next[0].desc ? "desc" : "asc"}`);
      else n.delete("sort");
      n.delete("page");
      setParams(n, { replace: false });
    },
    onPaginationChange: (update) => {
      const next =
        typeof update === "function" ? update({ pageIndex, pageSize }) : update;
      if (next.pageSize !== pageSize) {
        setPageSize(next.pageSize);
        firstPage();
      } else setPage(next.pageIndex);
    },
    onColumnFiltersChange: (update) => {
      setColumnFilters(update);
      firstPage();
    },
    onColumnVisibilityChange: setColumnVisibility,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: serverPaged ? undefined : getPaginationRowModel(),
    enableRowSelection: selection,
  });
  const pageCount = Math.max(1, table.getPageCount());
  // Keep a URL page that no longer exists (data or filters shrank) in range.
  useEffect(() => {
    if (!serverPaged && pageIndex > pageCount - 1) setPage(pageCount - 1, true);
  }, [serverPaged, pageIndex, pageCount]);
  const filtered = !!query.trim() || columnFilters.length > 0;
  const reset = () => {
    setQuery("");
    setColumnFilters([]);
    firstPage();
  };
  const toggleable = table
    .getAllLeafColumns()
    .filter(
      (c) =>
        typeof c.columnDef.header === "string" &&
        c.columnDef.header &&
        c.getCanHide() &&
        !hidden.includes(c.id),
    );
  const total = table.getFilteredRowModel().rows.length;
  const rows = table.getRowModel().rows;
  const from = serverPaged ? 1 : pageIndex * pageSize + 1;
  const visible = table.getVisibleLeafColumns().length;
  return (
    <div className="grid min-w-0 gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {search !== false && (
            <div className="relative w-full sm:w-64">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
              <Input
                aria-label={`Search ${label.toLowerCase()}`}
                placeholder={
                  typeof search === "string"
                    ? search
                    : `Search ${label.toLowerCase()}…`
                }
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  firstPage();
                }}
                className="h-8 pl-8"
              />
            </div>
          )}
          {filters.map((f) => {
            const column = table.getColumn(f.column);
            if (!column) return null;
            return (
              <FacetedFilter
                key={f.column}
                title={f.title}
                options={f.options}
                counts={column.getFacetedUniqueValues()}
                selected={(column.getFilterValue() as string[]) ?? []}
                onChange={(next) =>
                  column.setFilterValue(next.length ? next : undefined)
                }
              />
            );
          })}
          {toolbar}
          {filtered && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={reset}
            >
              Reset
              <X className="size-4" />
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {toggleable.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Columns3 className="size-4" />
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {toggleable.map((c) => (
                  <DropdownMenuCheckboxItem
                    key={c.id}
                    checked={c.getIsVisible()}
                    onCheckedChange={(v) => c.toggleVisibility(!!v)}
                    onSelect={(e) => e.preventDefault()}
                  >
                    {String(c.columnDef.header)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
      <div className="bg-card overflow-hidden rounded-lg border">
        <Table aria-label={label}>
          <TableHeader>
            {table.getHeaderGroups().map((g) => (
              <TableRow key={g.id} className="hover:bg-transparent">
                {g.headers.map((h) => {
                  const sorted = h.column.getIsSorted();
                  return (
                    <TableHead
                      key={h.id}
                      className="bg-muted/40 h-10 px-4 tracking-normal normal-case"
                      aria-sort={
                        sorted === "asc"
                          ? "ascending"
                          : sorted === "desc"
                            ? "descending"
                            : undefined
                      }
                    >
                      {h.isPlaceholder ? null : h.column.getCanSort() ? (
                        <button
                          type="button"
                          className="hover:bg-accent hover:text-foreground -ml-2 inline-flex h-8 items-center gap-1.5 rounded-md px-2 font-medium"
                          onClick={h.column.getToggleSortingHandler()}
                        >
                          {flexRender(
                            h.column.columnDef.header,
                            h.getContext(),
                          )}
                          {sorted === "asc" ? (
                            <ArrowUp className="size-3.5" />
                          ) : sorted === "desc" ? (
                            <ArrowDown className="size-3.5" />
                          ) : (
                            <ChevronsUpDown className="size-3.5 opacity-50" />
                          )}
                          <span className="sr-only">
                            {sorted || "unsorted"}
                          </span>
                        </button>
                      ) : (
                        flexRender(h.column.columnDef.header, h.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((r) => (
                <TableRow
                  key={r.id}
                  data-state={r.getIsSelected() ? "selected" : undefined}
                  className={cn(onRowClick && "cursor-pointer")}
                  tabIndex={onRowClick ? 0 : undefined}
                  onClick={
                    onRowClick &&
                    ((e) => {
                      if (!(e.target as HTMLElement).closest(interactive))
                        onRowClick(r.original);
                    })
                  }
                  onKeyDown={
                    onRowClick &&
                    ((e) => {
                      if (e.key === "Enter" && e.target === e.currentTarget)
                        onRowClick(r.original);
                    })
                  }
                >
                  {r.getVisibleCells().map((c) => (
                    <TableCell
                      key={c.id}
                      className="text-foreground px-4 py-3 text-sm"
                    >
                      {flexRender(c.column.columnDef.cell, c.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={visible}
                  className="text-muted-foreground h-32 text-center text-sm"
                >
                  {filtered ? (
                    <div className="grid justify-items-center gap-2">
                      No results match your search or filters.
                      <Button variant="outline" size="sm" onClick={reset}>
                        Clear filters
                      </Button>
                    </div>
                  ) : (
                    (empty ?? `No ${label.toLowerCase()} yet.`)
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {!serverPaged && data.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div
            className="text-muted-foreground text-sm"
            title="Search, sorting and paging apply to the records loaded from the server."
          >
            {selection
              ? `${table.getFilteredSelectedRowModel().rows.length} of ${total} row(s) selected.`
              : total
                ? `Showing ${from}–${from + rows.length - 1} of ${total}${filtered ? ` (filtered from ${data.length})` : ""}`
                : `0 of ${data.length}`}
          </div>
          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Rows per page</span>
              <NativeSelect
                aria-label="Rows per page"
                className="h-8 w-[76px]"
                value={pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
              >
                {[10, 20, 50, 100].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </NativeSelect>
            </div>
            <span className="text-sm font-medium">
              Page {Math.min(pageIndex, pageCount - 1) + 1} of {pageCount}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="hidden lg:inline-flex"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.setPageIndex(0)}
                aria-label="First page"
              >
                <ChevronsLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                aria-label="Previous page"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                aria-label="Next page"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="hidden lg:inline-flex"
                disabled={!table.getCanNextPage()}
                onClick={() => table.setPageIndex(pageCount - 1)}
                aria-label="Last page"
              >
                <ChevronsRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
