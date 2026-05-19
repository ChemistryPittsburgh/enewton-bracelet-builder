import { X } from "lucide-react";

interface SavedDesignsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const STATUSES = [
  "Published",
  "Approved",
  "In-review",
  "In-progress",
  "Design concepts",
  "Discontinued (vintage)",
];

export function SavedDesignsPanel({ isOpen, onClose }: SavedDesignsPanelProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white">
      {/* Top bar */}
      <div className="flex shrink-0 items-center justify-between border-b border-neutral-200 px-8 py-4">
        <h2 className="text-xl font-semibold text-neutral-800">Saved designs</h2>
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
        >
          Return to builder <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 shrink-0 overflow-y-auto border-r border-neutral-200 p-4">
          <nav className="flex flex-col gap-1">
            {STATUSES.map((status) => (
              <button
                key={status}
                className="rounded-lg px-4 py-2 text-left text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
              >
                {status}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <div className="flex flex-1 flex-col overflow-hidden p-8">
          {/* Placeholder — swap in real content later */}
          <p className="text-sm text-neutral-500">No saved designs yet.</p>
        </div>
      </div>
    </div>
  );
}