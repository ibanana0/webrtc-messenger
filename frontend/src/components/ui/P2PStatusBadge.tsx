'use client'

interface P2PStatusBadgeProps {
    /** Status koneksi ke server */
    isConnected: boolean
    /** Jumlah peer yang terhubung */
    peerCount: number
    /** Callback saat badge diklik */
    onClick?: () => void
}

export function P2PStatusBadge({ isConnected, peerCount, onClick }: P2PStatusBadgeProps) {
    const getStatusColor = () => {
        if (!isConnected) return 'bg-red-500/20 text-red-400 border-red-500/30'
        if (peerCount > 0) return 'bg-green-500/20 text-green-400 border-green-500/30'
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    }

    const getStatusIcon = () => {
        if (!isConnected) return '🔴'
        if (peerCount > 0) return '🟢'
        return '🟡'
    }

    const getStatusText = () => {
        if (!isConnected) return 'Offline'
        if (peerCount > 0) return `${peerCount} peer${peerCount > 1 ? 's' : ''}`
        return 'No peers'
    }

    return (
        <button
            onClick={onClick}
            className={`
                flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                border backdrop-blur-sm transition-all
                hover:scale-105 active:scale-95
                ${getStatusColor()}
            `}
            title="Click to view P2P Network status"
        >
            <span>{getStatusIcon()}</span>
            <span>{getStatusText()}</span>
            <span className="text-xs opacity-60">🔗</span>
        </button>
    )
}