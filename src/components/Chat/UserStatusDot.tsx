import type { Status } from "@/types/utilityTypes"

interface UserStatusDotProps {
        status: Status
}
const statusColor = {
        'online': 'bg-online',
        'offline': 'bg-offline',
        'invisible': 'bg-offline',
        'away': 'bg-idle',
        'dnd': 'bg-dnd'
}
export const UserStatusDot = ({ status }: UserStatusDotProps) => (
        <div className={`absolute bottom-0 right-0 w-3 h-3 ${statusColor[status] ?? 'bg-offline'} rounded-full border-2 border-overlay`} />
)