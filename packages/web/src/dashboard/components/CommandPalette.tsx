import { useState } from "react";
import { Icon, type IconName } from "../../ui/Icon";
import { Kbd } from "../../ui/Kbd";
import type { DashboardPage } from "../app/shell";

/** Props for the {@link CommandPalette}. */
export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  pages: DashboardPage[];
  onNavigate: (path: string) => void;
  onToggleTheme: () => void;
}

interface Command {
  label: string;
  icon: IconName;
  run: () => void;
}

/**
 * CommandPalette — the ⌘K command palette: a fuzzy filter over navigation and quick
 * actions (theme, docs). Open/close and the keyboard shortcut are owned by the shell;
 * this renders the overlay and list when `open`.
 */
export function CommandPalette({ open, onClose, pages, onNavigate, onToggleTheme }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  if (!open) {
    return null;
  }

  const commands: Command[] = [
    ...pages.map((page) => ({
      label: `Go to ${page.nav.label}`,
      icon: page.nav.icon ?? "Circle",
      run: () => {
        onNavigate(page.path);
        onClose();
      },
    })),
    {
      label: "Toggle theme",
      icon: "SunMoon",
      run: () => {
        onToggleTheme();
        onClose();
      },
    },
    {
      label: "Open documentation",
      icon: "BookOpen",
      run: () => {
        window.open("https://docs.sidequestjs.com", "_blank", "noreferrer");
        onClose();
      },
    },
  ];
  const matches = commands.filter((command) => command.label.toLowerCase().includes(query.toLowerCase()));

  return (
    <div
      role="presentation"
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] bg-[rgba(6,10,22,0.55)] backdrop-blur-[3px]"
    >
      <div
        role="dialog"
        aria-label="Command palette"
        onClick={(e) => e.stopPropagation()}
        className="dash-palette w-[min(560px,92vw)] bg-surface-card border border-edge-strong rounded-xl shadow-lg overflow-hidden"
      >
        <div className="flex items-center gap-2.5 px-4 py-3.5 border-b border-edge">
          <Icon name="Search" size={16} className="text-fg-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent border-none outline-none text-fg text-[15px] font-sans"
          />
          <Kbd>Esc</Kbd>
        </div>
        <div className="p-2 max-h-[320px] overflow-y-auto">
          {matches.length === 0 && <div className="p-5 text-center text-fg-muted text-[13px]">No commands found.</div>}
          {matches.map((command) => (
            <button
              key={command.label}
              type="button"
              onClick={command.run}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-left bg-transparent text-fg text-sm font-sans transition-colors hover:bg-surface-hover"
            >
              <Icon name={command.icon} size={16} className="text-fg-muted" />
              <span className="flex-1">{command.label}</span>
              <Icon name="CornerDownLeft" size={14} className="text-fg-muted" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
