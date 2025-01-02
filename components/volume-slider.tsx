'use client'

import { useState, useEffect, useRef } from 'react'
import { Volume2, VolumeX } from 'lucide-react'

interface VolumeSliderProps {
  videoRef: React.RefObject<HTMLVideoElement>
}

export function VolumeSlider({ videoRef }: VolumeSliderProps) {
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const sliderRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume
      videoRef.current.muted = isMuted
    }
  }, [volume, isMuted, videoRef])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    setIsMuted(!isMuted)
    if (isMuted && volume === 0) {
      setVolume(1)
    }
  }

  return (
    <div 
      className="flex items-center space-x-2 bg-gray-800/50 backdrop-blur-sm rounded-full p-2"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button onClick={toggleMute} className="text-white hover:text-gray-300">
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>
      {isHovered && (
        <>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-24 h-2 bg-white/20 rounded-full appearance-none cursor-pointer"
            ref={sliderRef}
            style={{
              background: `linear-gradient(to right, white ${volume * 100}%, rgba(255,255,255,0.2) ${volume * 100}%)`,
            }}
          />
          <span className="text-white text-sm font-['VT323'] min-w-[2ch]">
            {Math.round(volume * 100)}
          </span>
        </>
      )}
    </div>
  )
}

