'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { VolumeSlider } from '@/components/volume-slider'
import { Github, Book } from 'lucide-react'

export default function Page() {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    setIsLoaded(true)
  }, [])

  useEffect(() => {
    const handleMouseMove = () => {
      if (videoRef.current && !isVideoPlaying) {
        videoRef.current.currentTime = 0 // Reset to start
        videoRef.current.play()
          .then(() => {
            setIsVideoPlaying(true)
          })
          .catch(error => {
            console.error('Video playback failed:', error)
          })
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [isVideoPlaying])

  return (
    <div className="h-screen w-full overflow-hidden relative">
      {/* Video Background */}
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
        style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 1s ease-in' }}
        onLoadedData={() => setIsLoaded(true)}
      >
        <source src="/placeholder.mp4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content Container */}
      <div className="relative z-10 h-full w-full flex flex-col font-['VT323']">
        {/* Navbar Container */}
        <div className="w-full px-4 pt-4">
          <nav className="mx-auto max-w-7xl">
            <div className="h-16 rounded-full bg-gray-500/20 backdrop-blur-sm">
              <div className="h-full px-6 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-2 text-white">
                  <span className="text-2xl font-semibold">Brine AI</span>
                </Link>
                <div className="flex items-center gap-4">
                  <Button
                    variant="ghost"
                    className="text-white hover:text-white hover:bg-white/20 text-xl"
                    asChild
                  >
                    <Link href="https://github.com/brineai/brineaiutil" target="_blank" rel="noopener noreferrer">
                      <Github className="mr-2" size={24} />
                      GitHub
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    className="text-white hover:text-white hover:bg-white/20 text-xl"
                    asChild
                  >
                    <Link href="docs.brineai.xyz">
                      <Book className="mr-2" size={24} />
                      Docs
                    </Link>
                  </Button>
                  <Link href="/launch" className="minecraft-btn-custom relative group">
                    <Image
                      src="/grass-block.png"
                      alt="Grass Block Button"
                      width={120}
                      height={40}
                      className="w-[120px] h-[40px] image-pixelated"
                    />
                    <span className="absolute inset-0 flex items-center justify-center text-white text-xl">
                      Launch
                    </span>
                  </Link>
                </div>
              </div>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl md:text-5xl lg:text-6xl text-white tracking-wide">
              Your Solana-based wallet assistant
            </h2>
          </div>
        </main>

        {/* Volume Slider */}
        <div className="absolute bottom-4 left-4">
          <VolumeSlider videoRef={videoRef} />
        </div>
      </div>
    </div>
  )
}

