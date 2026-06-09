import type { User } from '@/types/userTypes';
import { Crown, UserMinus } from 'lucide-react';

interface ClusterMemberItemProps {
    user: User;
    isOwner: boolean;
    isCurrentUser: boolean;
    onRemove?: () => void;
}

export const ClusterMemberItem = ({
    user,
    isOwner,
    isCurrentUser,
    onRemove,
}: ClusterMemberItemProps) => {
    return (
        <div className="flex items-center gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
            {/* Avatar */}
            <div className="relative shrink-0">
                {user.avatar ? (
                    <img
                        src={user.avatar}
                        alt={user.display_name}
                        className="h-9 w-9 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                        {user.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                )}
                {/* Online status dot */}
                {user.status && (
                    <span
                        className={`absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-background ${user.status === 'online' ? 'bg-green-500' : 'bg-muted-foreground'
                            }`}
                    />
                )}
            </div>

            {/* Info */}
            <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium text-foreground">
                        {user.display_name}
                        {isCurrentUser && (
                            <span className="ml-1 text-xs text-muted-foreground">(you)</span>
                        )}
                    </span>
                    {isOwner && (
                        <Crown className="h-3.5 w-3.5 shrink-0 text-yellow-500" />
                    )}
                </div>
                <span className="truncate text-xs text-muted-foreground">
                    @{user.username}
                </span>
            </div>

            {/* Status label */}
            {user.status && (
                <span className="shrink-0 text-xs capitalize text-muted-foreground">
                    {user.status}
                </span>
            )}

            {onRemove && (
                <button
                    onClick={onRemove}
                    className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-danger-subtle hover:text-danger"
                    title="Remove member"
                >
                    <UserMinus className="h-4 w-4" />
                </button>
            )}
        </div>
    );
};