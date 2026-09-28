import { useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command } from "cmdk";
import {
  Building2,
  Check,
  ChevronsUpDown,
  MapPin,
  Search,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { useT } from "../ui";

export function SiteSwitcher({
  sites,
  value,
  onChange,
  collapsed = false,
}: {
  sites: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  collapsed?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const t = useT();
  const selected = sites.find((s) => s.id === value);
  return (
    <div className="site-switch">
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger asChild>
          <Button
            variant="outline"
            className="site-trigger"
            aria-label={t("Select site", "साइट चुनें")}
            title={selected?.name}
          >
            <span className="site-trigger-icon">
              <Building2 size={16} strokeWidth={1.75} aria-hidden="true" />
            </span>
            {!collapsed && (
              <>
                <span className="site-trigger-text">
                  <small>{t("Site", "साइट")}</small>
                  {selected?.name ?? t("Select a site", "साइट चुनें")}
                </span>
                <ChevronsUpDown size={14} aria-hidden="true" />
              </>
            )}
          </Button>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content
            className="command-popover"
            sideOffset={8}
            align="start"
          >
            <Command label="Sites">
              <div className="command-search">
                <Search size={16} />
                <Command.Input
                  placeholder={t("Search sites…", "साइट खोजें…")}
                />
              </div>
              <Command.List>
                <Command.Empty>
                  {t("No matching sites", "कोई साइट नहीं मिली")}
                </Command.Empty>
                {sites.map((s) => (
                  <Command.Item
                    key={s.id}
                    value={s.name + " " + s.id}
                    onSelect={() => {
                      onChange(s.id);
                      setOpen(false);
                    }}
                  >
                    <MapPin size={16} />
                    <span>{s.name}</span>
                    {value === s.id && <Check size={16} />}
                  </Command.Item>
                ))}
              </Command.List>
            </Command>
            <Popover.Arrow className="popover-arrow" />
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
