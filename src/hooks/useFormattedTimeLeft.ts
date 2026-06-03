import { useMemo } from 'react';

interface FormatTimeOptions {
  includeSeconds?: boolean;
}

const useFormattedTimeLeft = (
  timeLeft: number | null,
  options: FormatTimeOptions = {}
): string | null => {
  const { includeSeconds = false } = options;

  return useMemo(() => {
    if (timeLeft === null) return null;

    const seconds = timeLeft;
    const minutes = timeLeft / 60;
    const hours = timeLeft / 3600;
    const days = timeLeft / 86400;

    if (days >= 1) {
      return `${Math.ceil(days)} d`;
    }

    if (hours >= 1) {
      return `${Math.ceil(hours)} h`;
    }

    if (minutes >= 1) {
      return `${Math.ceil(minutes)} min`;
    }

    if (includeSeconds && seconds >= 1) {
      return `${Math.ceil(seconds)} s`;
    }

    return '< 1 min';
  }, [timeLeft, includeSeconds]);
};

export default useFormattedTimeLeft;
