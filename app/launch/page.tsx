'use client'

import { useState, useEffect } from 'react'
import { Menu, Wallet, Copy, LogOut } from 'lucide-react'
import Image from 'next/image'
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Connection, PublicKey, LAMPORTS_PER_SOL, clusterApiUrl } from '@solana/web3.js'
import { RefreshButton } from '@/components/refresh-button'
import { CurrencyToggleButton } from '@/components/currency-toggle-button'
import Link from 'next/link'

type Message = {
  role: 'user' | 'assistant'
  content: string
}

type Chat = {
  id: string
  title: string
  timestamp: Date
  messages: Message[]
}

type Token = {
  symbol: string
  name: string
  balance: number
  usdValue?: number
}

type WalletData = {
  address: string | null
  balance: number | null
  tokens: Token[]
  isLoading: boolean
}

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean
      connect: () => Promise<{ publicKey: { toString: () => string } }>
      disconnect: () => Promise<void>
      on: (event: string, callback: () => void) => void
      off: (event: string, callback: () => void) => void
      isConnected?: boolean
    }
  }
}

export default function LaunchPage() {
  const [input, setInput] = useState('')
  const [username, setUsername] = useState('')
  const [isUsernameSet, setIsUsernameSet] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isWalletOpen, setIsWalletOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState<Chat[]>([])
  const [currentChatId, setCurrentChatId] = useState<string | null>(null)
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [walletData, setWalletData] = useState<WalletData>({
    address: null,
    balance: null,
    tokens: [],
    isLoading: false
  })
  const [showUSD, setShowUSD] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (currentChatId === null && chatHistory.length > 0) {
      setCurrentChatId(chatHistory[0].id)
    }

    // Check if Phantom is installed
    const checkPhantomWallet = () => {
      if ('solana' in window && window.solana?.isPhantom) {
        console.log('Phantom wallet is installed!')
      } else {
        console.log('Phantom wallet is not installed')
      }
    }

    checkPhantomWallet()

    // Check if the wallet is already connected
    if (window.solana && window.solana.isConnected) {
      setIsWalletConnected(true);
      updateWalletData();
    }

    // Listen for wallet connection changes
    const handleWalletConnection = () => {
      setIsWalletConnected(true)
      updateWalletData()
    }

    const handleWalletDisconnection = () => {
      setIsWalletConnected(false)
      setWalletData({
        address: null,
        balance: null,
        tokens: [],
        isLoading: false
      })
    }

    if (window.solana) {
      window.solana.on('connect', handleWalletConnection)
      window.solana.on('disconnect', handleWalletDisconnection)
    }

    return () => {
      if (window.solana) {
        window.solana.off('connect', handleWalletConnection)
        window.solana.off('disconnect', handleWalletDisconnection)
      }
    }
  }, [currentChatId, chatHistory])

  const connectWallet = async () => {
    if ('solana' in window && window.solana.isPhantom) {
      try {
        const { publicKey } = await window.solana.connect();
        setWalletData(prev => ({ ...prev, address: publicKey.toString() }));
        setIsWalletConnected(true);
        await updateWalletData();
      } catch (err) {
        console.error('Failed to connect wallet:', err);
      }
    } else {
      console.log('Phantom wallet is not installed');
      // You might want to add a user-friendly message here
    }
  }

  const disconnectWallet = async () => {
    if ('solana' in window && window.solana.isPhantom) {
      try {
        await window.solana.disconnect();
        setIsWalletConnected(false);
        setWalletData({
          address: null,
          balance: null,
          tokens: [],
          isLoading: false
        });
      } catch (err) {
        console.error('Failed to disconnect wallet:', err);
      }
    }
  };

  const updateWalletData = async () => {
    if ('solana' in window && window.solana.isConnected) {
      setWalletData(prev => ({ ...prev, isLoading: true }))
      const address = window.solana.publicKey?.toString() || null
    
      try {
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed')
        const publicKey = new PublicKey(address!)
        const balance = await connection.getBalance(publicKey)
        const solBalance = balance / LAMPORTS_PER_SOL

        // Fetch token balances
        const response = await fetch('https://streaming.bitquery.io/eap', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ory_at_4R1mh02hzaRjEET7jn7JNUEzUwZTuCdxVM-yRKvSwx8.tr3jXPhMNhnduR-McciLcoq_cyOpNzG8RMq243fwv-g'
          },
          body: JSON.stringify({
            query: `
              query MyQuery {
                Solana {
                  BalanceUpdates(
                    where: {BalanceUpdate: {Account: {Owner: {is: "${address}"}}}}
                    orderBy: {descendingByField: "BalanceUpdate_Balance_maximum"}
                  ) {
                    BalanceUpdate {
                      Balance: PostBalance(maximum: Block_Slot, selectWhere: {gt: "0.01"})
                      Currency {
                        Name
                        Symbol
                      }
                      AmountInUSD: PostBalanceInUSD(maximum: Block_Slot)
                    }
                  }
                }
              }
            `,
            variables: "{}"
          })
        });

        const data = await response.json();
        const tokenBalances = data.data.Solana.BalanceUpdates.map(update => ({
          symbol: update.BalanceUpdate.Currency.Symbol,
          name: update.BalanceUpdate.Currency.Name,
          balance: parseFloat(update.BalanceUpdate.Balance),
          usdValue: parseFloat(update.BalanceUpdate.AmountInUSD || '0'),
        }));

        setWalletData({
          address,
          balance: solBalance,
          tokens: tokenBalances,
          isLoading: false
        })
      } catch (error) {
        console.error('Failed to fetch wallet data:', error)
        setWalletData(prev => ({ ...prev, isLoading: false }))
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (input.trim()) {
      // Handle special @roastme command
      if (input.trim().toLowerCase() === '@roastme') {
        if (!isWalletConnected || !walletData.address) {
          const errorMessage: Message = { 
            role: 'assistant', 
            content: "I can't roast what I can't see! Connect your wallet first, if you dare..." 
          }
          setChatHistory(prev => prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: [...chat.messages, { role: 'user', content: input.trim() }, errorMessage] }
              : chat
          ))
          setInput('')
          return
        }

        // Prepare wallet data for roasting
        const walletRoastPrompt = {
          role: 'system',
          content: `You are BRINE, a savage Minecraft Herobrine AI that roasts people's crypto wallets. 
          Here's the wallet data to roast:
          - Wallet Address: ${walletData.address}
          - SOL Balance: ${walletData.balance} SOL
          - Token Holdings: ${walletData.tokens.map(t => 
            `${t.balance} ${t.symbol} (Worth $${t.usdValue?.toFixed(2) || '0'})`
          ).join(', ')}
          
          Be creative, funny, and savage, but keep it Minecraft-themed. Reference Herobrine lore if possible.`
        }

        setInput('')
        setIsLoading(true)

        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              messages: [walletRoastPrompt, { role: 'user', content: 'Roast this wallet!' }]
            }),
          })

          if (!response.ok) {
            throw new Error('Failed to get roast response')
          }

          const data = await response.json()
          
          setChatHistory(prev => prev.map(chat => 
            chat.id === currentChatId 
              ? { 
                  ...chat, 
                  messages: [
                    ...chat.messages, 
                    { role: 'user', content: input.trim() },
                    { role: 'assistant', content: data.response }
                  ] 
                }
              : chat
          ))
        } catch (error) {
          console.error('Error getting wallet roast:', error)
          const errorMessage: Message = { 
            role: 'assistant', 
            content: "Even Herobrine couldn't process this roast. Try again later!" 
          }
          setChatHistory(prev => prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: [...chat.messages, { role: 'user', content: input.trim() }, errorMessage] }
              : chat
          ))
        } finally {
          setIsLoading(false)
        }
        return
      }

      // Regular message handling continues here...
      const newMessage: Message = { role: 'user', content: input.trim() }
      
      // Clear input and set loading state immediately
      setInput('')
      setIsLoading(true)
      
      try {
        // Get the current chat's messages
        const currentMessages = chatHistory
          .find(chat => chat.id === currentChatId)
          ?.messages || []

        // Add the new message to chat history first
        if (!currentChatId) {
          const newChatId = Date.now().toString()
          const newChat: Chat = {
            id: newChatId,
            title: input.trim(),
            timestamp: new Date(),
            messages: [newMessage]
          }
          setChatHistory(prev => [newChat, ...prev])
          setCurrentChatId(newChatId)
        } else {
          setChatHistory(prev => prev.map(chat => 
            chat.id === currentChatId 
              ? { ...chat, messages: [...chat.messages, newMessage] }
              : chat
          ))
        }

        // Send request to API
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            messages: [...currentMessages, newMessage]
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(`HTTP error! status: ${response.status}, message: ${JSON.stringify(errorData)}`)
        }

        const data = await response.json()
        
        if (!data.response) {
          throw new Error('No response received from API')
        }

        const brineResponse: Message = { role: 'assistant', content: data.response }
        
        // Update chat history with AI response only
        setChatHistory(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: [...chat.messages, brineResponse] }
            : chat
        ))
      } catch (error) {
        console.error('Error fetching response from BRINE:', error)
        const errorMessage: Message = { 
          role: 'assistant', 
          content: `I apologize, but I encountered an error while processing your request: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.` 
        }
        setChatHistory(prev => prev.map(chat => 
          chat.id === currentChatId 
            ? { ...chat, messages: [...chat.messages, errorMessage] }
            : chat
        ))
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleNewChat = () => {
    const newChatId = Date.now().toString()
    const newChat: Chat = {
      id: newChatId,
      title: 'New Chat',
      timestamp: new Date(),
      messages: []
    }
    setChatHistory(prev => [newChat, ...prev])
    setCurrentChatId(newChatId)
  }

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (username.trim()) {
      setIsUsernameSet(true)
      handleNewChat()
    }
  }

  const loadChat = (chatId: string) => {
    setCurrentChatId(chatId)
  }

  const copyWalletAddress = () => {
    if (walletData.address) {
      navigator.clipboard.writeText(walletData.address)
        .then(() => console.log('Wallet address copied to clipboard'))
        .catch(err => console.error('Failed to copy wallet address:', err))
    }
  }

  const currentChat = chatHistory.find(chat => chat.id === currentChatId) || null
  console.log('Current chat:', currentChat)

  return (
    <div className="min-h-screen w-full relative bg-[#1D1D1D] overflow-hidden flex flex-col items-center">
      {/* Background Image */}
      <Image
        src="/minecraft-bg.webp"
        alt="Dirt texture background"
        fill
        className="object-cover opacity-20"
        priority
      />

      {/* Left Sidebar (Chat History) */}
      <div 
        className={`fixed left-0 top-0 h-full w-64 bg-black/90 z-20 transform transition-transform duration-300 ease-in-out ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="minecraft-box border-r-0 border-t-0 border-b-0 h-full flex flex-col">
          <div className="p-4 border-b-2 border-[#373737]">
            <h2 className="text-white font-['VT323'] text-xl">Chat History</h2>
          </div>
          
          {/* New Chat Button */}
          <button 
            onClick={handleNewChat}
            className="mx-4 mt-4 mb-2 bg-green-500 hover:bg-green-600 transition-colors minecraft-box border-2 border-green-700 p-2 flex items-center justify-center gap-2"
          >
            <span className="font-['VT323'] text-black text-lg">New Chat</span>
          </button>

          {/* Divider */}
          <div className="mx-4 my-2 border-b-2 border-[#373737]" />

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto minecraft-scrollbar p-4 space-y-2">
            {chatHistory.map((chat) => (
              <button
                key={chat.id}
                onClick={() => loadChat(chat.id)}
                className={`w-full text-left p-2 minecraft-box ${
                  currentChatId === chat.id ? 'bg-green-900/50' : 'bg-black/50'
                } hover:bg-black/70 transition-colors`}
              >
                <span className="font-['VT323'] text-white text-lg truncate block">
                  {chat.title}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Sidebar (Wallet Info) */}
      <div 
        className={`fixed right-0 top-0 h-full w-64 bg-black/90 z-20 transform transition-transform duration-300 ease-in-out ${
          isWalletOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="minecraft-box border-l-0 border-t-0 border-b-0 h-full flex flex-col">
          <div className="p-4 border-b-2 border-[#373737]">
            <h2 className="text-white font-['VT323'] text-xl">Wallet Info</h2>
          </div>
          
          {/* Wallet Balance */}
          <div className="p-4 border-b-2 border-[#373737]">
            <div className="text-white font-['VT323']">
              <div className="text-sm text-gray-400 flex items-center justify-between">
                <span>Wallet Balance</span>
                <CurrencyToggleButton 
                  onClick={() => setShowUSD(!showUSD)} 
                  showUSD={showUSD}
                />
              </div>
              {isWalletConnected ? (
                walletData.isLoading ? (
                  <div className="text-lg text-yellow-500">Loading...</div>
                ) : (
                  <div className="text-2xl">
                    {(() => {
                      // Calculate total USD value
                      const totalUSDValue = walletData.tokens.reduce((sum, token) => 
                        sum + (token.usdValue || 0), 0
                      );
                      
                      // Find SOL token data to calculate SOL price
                      const solToken = walletData.tokens.find(token => token.symbol === 'SOL');
                      const solPrice = solToken 
                        ? solToken.usdValue! / solToken.balance 
                        : 0;
                      
                      // Calculate total SOL value
                      const totalSOLValue = solPrice > 0 
                        ? totalUSDValue / solPrice
                        : walletData.balance || 0;

                      return showUSD 
                        ? `$${totalUSDValue.toFixed(2)}`
                        : `${totalSOLValue.toFixed(4)} SOL`;
                    })()}
                  </div>
                )
              ) : (
                <div className="text-lg text-yellow-500">Connect Wallet</div>
              )}
            </div>
          </div>

          {/* Token List */}
          <div className="flex-1 overflow-y-auto minecraft-scrollbar p-4 space-y-2">
            {isWalletConnected ? (
              walletData.isLoading ? (
                <div className="text-yellow-500 font-['VT323'] text-center">
                  Loading tokens...
                </div>
              ) : walletData.tokens.length > 0 ? (
                walletData.tokens.map((token) => (
                  <div
                    key={token.symbol}
                    className="minecraft-box bg-black/50 p-2"
                  >
                    <div className="font-['VT323'] text-white">
                      <span className="text-gray-400">{token.name || token.symbol}</span>
                      <span className="float-right">
                        {showUSD 
                          ? `$${token.usdValue?.toFixed(2) || '0.00'}`
                          : `${token.balance.toFixed(4)}`
                        }
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-yellow-500 font-['VT323'] text-center">
                  No tokens found
                </div>
              )
            ) : (
              <div className="text-yellow-500 font-['VT323'] text-center">
                Connect wallet to view tokens
              </div>
            )}
          </div>

          {/* Bottom Section */}
          <div className="p-4 space-y-2 border-t-2 border-[#373737]">
            {/* Refresh Button */}
            <RefreshButton 
              onClick={updateWalletData}
              disabled={!isWalletConnected || walletData.isLoading}
            />

            {/* Connect/Disconnect Wallet Button */}
            {isWalletConnected ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full minecraft-box bg-[#6d28d9] hover:bg-[#5b21b6] p-2 flex items-center justify-center gap-2">
                    <Wallet size={18} className="text-white" />
                    <span className="font-['VT323'] text-white text-lg">
                      {walletData.address 
                        ? `${walletData.address.slice(0, 4)}...${walletData.address.slice(-4)}`
                        : 'Connected'}
                    </span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 bg-black border border-gray-700">
                  <DropdownMenuItem onClick={copyWalletAddress} className="text-white hover:bg-gray-800">
                    <Copy className="mr-2 h-4 w-4" />
                    <span>Copy Address</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={disconnectWallet} className="text-white hover:bg-gray-800">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Disconnect</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <button 
                onClick={connectWallet}
                className="w-full minecraft-box bg-[#6d28d9] hover:bg-[#5b21b6] p-2 flex items-center justify-center gap-2"
              >
                <Wallet size={18} className="text-white" />
                <span className="font-['VT323'] text-white text-lg">Connect Wallet</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content Container */}
      <div className="w-full max-w-[850px] flex flex-col min-h-screen relative z-10 p-4 gap-4">
        {/* Navbar */}
        <div className="minecraft-box bg-black/50 h-12 flex items-center px-4">
          <button 
            className="text-white hover:text-gray-300 transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            <Menu size={20} />
          </button>
          <Link href="/" className="ml-4 text-white font-['VT323'] text-xl hover:text-gray-300 transition-colors">
            Brine AI
          </Link>
          <div className="flex-grow" />
          <button 
            className="minecraft-icon-btn p-1.5"
            onClick={() => setIsWalletOpen(!isWalletOpen)}
          >
            <Wallet size={18} className="text-white" />
          </button>
        </div>

        {/* Chat Area */}
        <div className="flex-grow flex flex-col gap-4">
          {/* Output Area */}
          <div className="flex-grow overflow-auto font-['VT323'] text-lg space-y-2 minecraft-scrollbar bg-black/50 p-5 minecraft-box min-h-[400px]">
            {currentChat?.messages.map((msg, index) => (
              <div key={index} className={msg.role === 'assistant' ? 'text-cyan-400' : 'text-green-400'}>
                {msg.role === 'assistant' ? '<BRINE>' : `<${username.toUpperCase()}>`} {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="text-yellow-500">
                <span className="animate-pulse">BRINE is thinking...</span>
              </div>
            )}
          </div>

          {/* Input Area */}
          {!isUsernameSet ? (
            <form onSubmit={handleUsernameSubmit} className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full minecraft-input font-['VT323'] text-lg p-2 focus:outline-none text-white"
                placeholder="Enter your username..."
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-600 text-white font-['VT323'] text-lg px-4 py-1 hover:bg-green-700 focus:outline-none"
              >
                Set Username
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="relative">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full minecraft-input font-['VT323'] text-lg p-2 focus:outline-none text-white"
                placeholder="Type your message..."
                disabled={isLoading}
              />
              <button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-green-600 text-white font-['VT323'] text-lg px-4 py-1 hover:bg-green-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isLoading}
              >
                Send
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

