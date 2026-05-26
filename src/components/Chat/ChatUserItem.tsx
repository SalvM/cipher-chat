// ChatUserItem.tsx
import { Avatar } from "@/components/ui/avatar"
import { UserStatusDot } from "./UserStatusDot";
import type { User } from "@/types/userTypes";

interface ChatUserItemProps {
    isSelected: boolean;
    user?: User;
    onClick: () => void;
}

export const ChatUserItem = ({
    isSelected,
    user,
    onClick,
}: ChatUserItemProps) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full text-left ${isSelected
                ? 'bg-primary-subtle'
                : 'hover:bg-ghost-hover'
                }`}
        >
            <div className="relative shrink-0">
                <Avatar src={user?.avatar} alt={user?.display_name} size="md" />
                {user?.status && <UserStatusDot status={user.status} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                    {user?.display_name}
                </p>
                <p className="text-xs text-text-muted truncate">
                    @{user?.username}
                </p>
            </div>
        </button>
    );
};
