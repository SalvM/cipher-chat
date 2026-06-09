import { Users } from 'lucide-react';

interface ClusterItemProps {
    name: string;
    memberCount: number;
    isSelected: boolean;
    onClick: () => void;
}

export const ClusterItem = ({
    name,
    memberCount,
    isSelected,
    onClick,
}: ClusterItemProps) => {
    return (
        <button
            onClick={onClick}
            className={`flex items-center gap-3 p-3 rounded-lg transition-colors w-full text-left ${isSelected
                ? 'bg-primary-subtle'
                : 'hover:bg-ghost-hover'
                }`}
        >
            <div className="shrink-0 w-10 h-10 bg-secondary rounded-lg flex items-center justify-center">
                <Users size={18} className="text-text-secondary" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                    {name}
                </p>
                <p className="text-xs text-text-secondary truncate">
                    {memberCount} members
                </p>
            </div>
        </button>
    );
};
