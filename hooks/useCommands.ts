'use client'

import { useMemo, useState, useEffect } from 'react'
import { TOOLS } from '@/lib/tools/registry'
import type { Tool } from '@/types'

export function useCommands(input: string) {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Check if input starts with /
  const showCommands = input.startsWith('/')

  // Filter commands based on input
  const filteredCommands = useMemo(() => {
    if (!showCommands) return []

    const searchTerm = input.slice(1).toLowerCase()

    if (!searchTerm) return TOOLS

    return TOOLS.filter(
      tool =>
        tool.command.toLowerCase().includes(searchTerm) ||
        tool.name.toLowerCase().includes(searchTerm) ||
        tool.description.toLowerCase().includes(searchTerm)
    )
  }, [input, showCommands])

  // Reset selected index when filtered commands change
  useEffect(() => {
    setSelectedIndex(0)
  }, [filteredCommands])

  const handleCommandSelect = (command: Tool) => {
    // For now, just insert the command
    // In a more advanced implementation, we could:
    // 1. Parse parameters
    // 2. Show parameter input UI
    // 3. Execute the command directly
    return command.command
  }

  return {
    showCommands,
    filteredCommands,
    selectedIndex,
    setSelectedIndex,
    handleCommandSelect,
  }
}
