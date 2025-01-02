'use client'

import { RefreshCcw } from 'lucide-react'

interface CurrencyToggleButtonProps {
  onClick: () => void
  showUSD: boolean
}

export function CurrencyToggleButton({ onClick, showUSD }: CurrencyToggleButtonProps) {
  return (
    <button
      onClick={onClick}
      className="minecraft-icon-btn p-1.5 hover:bg-gray-800 transition-colors rounded-full"
      title={showUSD ? "Show token amount" : "Show USD value"}
    >
      <RefreshCcw size={16} className="text-white" />
    </button>
  )
}

