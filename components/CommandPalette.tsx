'use client'

import type { Tool } from '@/types'

interface CommandPaletteProps {
  commands: Tool[]
  selectedIndex: number
  onSelect: (command: Tool) => void
}

export default function CommandPalette({
  commands,
  selectedIndex,
  onSelect,
}: CommandPaletteProps) {
  if (commands.length === 0) {
    return null
  }

  return (
    <div className="absolute bottom-full mb-2 w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-lg overflow-hidden shadow-2xl">
      <div className="p-2 border-b border-white/10">
        <div className="text-white/50 text-xs">Available Commands</div>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {commands.map((command, index) => (
          <button
            key={command.name}
            onClick={() => onSelect(command)}
            className={`w-full text-left px-4 py-3 transition-colors ${
              index === selectedIndex
                ? 'bg-white/20 text-white'
                : 'hover:bg-white/10 text-white/70'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-mono text-sm">{command.command}</div>
                <div className="text-xs text-white/50 mt-1">
                  {command.description}
                </div>
              </div>
              {index === selectedIndex && (
                <div className="text-white/30 text-xs">↵</div>
              )}
            </div>
          </button>
        ))}
      </div>

      <div className="p-2 border-t border-white/10 bg-white/5">
        <div className="text-white/30 text-xs">
          Use ↑↓ to navigate • ↵ to select • Esc to cancel
        </div>
      </div>
    </div>
  )
}
