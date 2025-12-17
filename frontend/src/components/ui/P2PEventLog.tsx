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
                    label: 'Connected'
                }
            case 'peer_disconnected':
                return {
                    icon: '🔴',
                    color: 'text-red-400',
                    bg: 'bg-red-900/20',
                    label: 'Disconnected'
                }
            case 'message_from_peer':
                return {
                    icon: '💬',
                    color: 'text-blue-400',
                    bg: 'bg-blue-900/20',
                    label: 'Message'
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
            <CardHeader className="flex flex-row justify-between items-center pb-1 sm:pb-2 px-2 sm:px-4 pt-2 sm:pt-4">
                <CardTitle className="text-xs sm:text-sm">Event Log</CardTitle>
                {onClear && events.length > 0 && (
                    <button
                        onClick={onClear}
                        className="text-[10px] sm:text-xs text-gray-400 hover:text-white transition-colors"
                    >
                        Clear
                    </button>
                )}
            </CardHeader>
            <CardContent className="px-2 sm:px-4 pb-2 sm:pb-4">
                <div className="max-h-24 sm:max-h-32 md:max-h-48 overflow-y-auto space-y-1">
                    {displayEvents.length > 0 ? (
                        displayEvents.map((event, i) => {
                            const style = getEventStyle(event.type)
                            return (
                                <div
                                    key={`${event.timestamp}-${i}`}
                                    className={`${style.bg} p-1.5 sm:p-2 rounded text-[10px] sm:text-xs flex items-start gap-1 sm:gap-2`}
                                >
                                    <span className="flex-shrink-0">{style.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className={style.color}>
                                            {style.label}
                                        </span>
                                        <span className="text-gray-500 ml-1 sm:ml-2 truncate block text-[9px] sm:text-[10px]">
                                            {event.peer_id.slice(0, 12)}...
                                        </span>
                                    </div>
                                    <span className="text-gray-600 text-[8px] sm:text-[10px] whitespace-nowrap flex-shrink-0">
                                        {new Date(event.timestamp).toLocaleTimeString()}
                                    </span>
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center py-2 sm:py-4 text-gray-500 text-[10px] sm:text-xs">
                            No events yet
                        </div>
                    )}
                    <div ref={logEndRef} />
                </div>
            </CardContent>
        </Card>
    )
}