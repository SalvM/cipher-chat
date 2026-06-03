import { useState, useEffect, useMemo } from 'react';
import { Timer } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import useFormattedTimeLeft from '@/hooks/useFormattedTimeLeft';

interface MessageExpireTimerProps {
    expires_at: string | Date | null | undefined;
    className?: string;
    onExpire?: () => void;
}

/**
 * Component that displays a countdown for messages about to expire.
 * Updates every second and clears itself automatically.
 *
 * @example
 * <MessageExpireTimer expires_at={message.expires_at} />
 */
const MessageExpireTimer = ({
    expires_at,
    className = '',
    onExpire,
}: MessageExpireTimerProps) => {
    const [timeLeft, setTimeLeft] = useState<number | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    const formattedTime = useFormattedTimeLeft(timeLeft);

    // Dynamic tooltip
    const tooltipText = useMemo(() => {
        if (!timeLeft || isExpired) return 'Message expired';

        if (timeLeft < 60) {
            return `Expires in ${timeLeft}s`;
        }

        const mins = Math.ceil(timeLeft / 60);
        return `Expires in ${mins}min`;
    }, [timeLeft, isExpired]);

    useEffect(() => {
        if (!expires_at) return;

        const expiryDate = new Date(expires_at).getTime();
        let timerInterval: ReturnType<typeof setInterval> | null = null;

        const updateTimeLeft = () => {
            const now = Date.now();
            const diff = expiryDate - now;

            if (diff <= 0) {
                setIsExpired(true);
                setTimeLeft(null);
                if (onExpire instanceof Function) onExpire();
                if (timerInterval) clearInterval(timerInterval);
                return;
            }

            setTimeLeft(Math.round(diff / 1000));
            setIsExpired(false);
        };

        // Calculate right now
        updateTimeLeft();

        // Then update each second
        timerInterval = setInterval(updateTimeLeft, 1000);

        return () => {
            if (timerInterval) clearInterval(timerInterval);
        };
    }, [expires_at]);

    if (isExpired || timeLeft === null) {
        return null;
    }

    return (
        <Tooltip content={tooltipText}>
            <div className={`flex items-center gap-1 ${className}`}>
                <Timer className="w-3.5 h-3.5 text-warning" />
                <span className="text-xs font-medium text-warning">
                    {formattedTime}
                </span>
            </div>
        </Tooltip>
    );
};

export default MessageExpireTimer;