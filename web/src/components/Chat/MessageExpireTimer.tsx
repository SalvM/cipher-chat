import { useState, useEffect, useMemo } from 'react';
import { Tooltip } from '@/components/ui/tooltip';
import { ExpireChip } from '@/components/ui/expire-chip';
import useFormattedTimeLeft from '@/hooks/useFormattedTimeLeft';

interface MessageExpireTimerProps {
  expires_at: string | Date | null | undefined;
  className?: string;
  onExpire?: () => void;
}

const MessageExpireTimer = ({
  expires_at,
  className = '',
  onExpire,
}: MessageExpireTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  const formattedTime = useFormattedTimeLeft(timeLeft);

  const tooltipText = useMemo(() => {
    if (!timeLeft || isExpired) return 'Message expired';
    if (timeLeft < 60) return `Expires in ${timeLeft}s`;
    return `Expires in ${Math.ceil(timeLeft / 60)}min`;
  }, [timeLeft, isExpired]);

  useEffect(() => {
    if (!expires_at) return;

    const expiryDate = new Date(expires_at).getTime();
    let timerInterval: ReturnType<typeof setInterval> | null = null;

    const updateTimeLeft = () => {
      const diff = expiryDate - Date.now();
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

    updateTimeLeft();
    timerInterval = setInterval(updateTimeLeft, 1000);
    return () => { if (timerInterval) clearInterval(timerInterval); };
  }, [expires_at]);

  if (isExpired || timeLeft === null) return null;

  return (
    <Tooltip content={tooltipText}>
      <ExpireChip
        label={formattedTime}
        urgent={timeLeft !== null && timeLeft < 60}
        className={className}
      />
    </Tooltip>
  );
};

export default MessageExpireTimer;
