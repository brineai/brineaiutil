import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface RefreshButtonProps {
  onClick: () => void
  disabled: boolean
}

export function RefreshButton({ onClick, disabled }: RefreshButtonProps) {
  const [isSpinning, setIsSpinning] = useState(false)

  const handleClick = () => {
    setIsSpinning(true)
    onClick()
    setTimeout(() => setIsSpinning(false), 1000) // Stop spinning after 1 second
  }

  return (
    <button 
      onClick={handleClick}
      disabled={disabled}
      className={`w-full bg-green-500 hover:bg-green-600 transition-colors minecraft-box border-2 border-green-700 p-2 flex items-center justify-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <RefreshCw size={20} className={`text-black ${isSpinning ? 'animate-spin' : ''}`} />
      <span className="font-['VT323'] text-black text-lg">Refresh</span>
    </button>
  )
}

