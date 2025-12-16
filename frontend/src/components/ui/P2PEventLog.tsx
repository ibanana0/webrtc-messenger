'use client'
import { useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/glass/card'

interface P2PEvent {
    type: 'peer_connected' | 'peer_disconnected' | 'message_from_peer' | string
    peer_id: string
    data?: any
    timestamp: string
}

interface P2PEventLogProps {
    events: P2PEvent[]
    onClear?: () => void
    maxEvents?: number
}

export function P2PEventLog({ events, onClear, maxEvents = 50 }: P2PEventLogProps) {
    const logEndRef = useRef<HTMLDivElement>(null)
    useEffect(() => {
        logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [events])

    const getEventStyle = (type: string) => {
        switch (type) {
            case 'peer_connected':
                return { 
                    icon: '🟢', 
                    color: 'text-green-400', 
                    bg: 'bg-green-900/20',
                    label: 'Peer Connected'
                }
            case 'peer_disconnected':
                return { 
                    icon: '🔴', 
                    color: 'text-red-400', 
                    bg: 'bg-red-900/20',
                    label: 'Peer Disconnected'
                }
            case 'message_from_peer':
                return { 
                    icon: '💬', 
                    color: 'text-blue-400', 
                    bg: 'bg-blue-900/20',
                    label: 'Message from Peer'
                }
            default:
                return { 
                    icon: '📝', 
                    color: 'text-gray-400', 
                    bg: 'bg-gray-900/20',
                    label: type.replace(/_/g, ' ')
                }
        }
    }


    const displayEvents = events.slice(-maxEvents)

    return (
        <Card className="backdrop-blur-xl">
            <CardHeader className="flex flex-row justify-between items-center pb-2">
                <CardTitle className="text-sm">P2P Event Log</CardTitle>
                {onClear && events.length > 0 && (
                    <button 
                        onClick={onClear}
                        className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        Clear
                    </button>
                )}
            </CardHeader>
            <CardContent>
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {displayEvents.length > 0 ? (
                        displayEvents.map((event, i) => {
                            const style = getEventStyle(event.type)
                            return (
                                <div 
                                    key={`${event.timestamp}-${i}`}
                                    className={`${style.bg} p-2 rounded text-xs flex items-start gap-2`}
                                >
                                    <span>{style.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className={style.color}>
                                            {style.label}
                                        </span>
                                        <span className="text-gray-500 ml-2 truncate block">
                                            {event.peer_id.slice(0, 20)}...
                                        </span>
                                    </div>
                                    <span className="text-gray-600 text-[10px] whitespace-nowrap">
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center py-4 text-gray-500 text-xs">
                            No events yet. Events will appear here when peers connect or disconnect.
                        </div>
                    )}
                    <div ref={logEndRef} />
                </div>
            </CardContent>
        </Card>
    )
}