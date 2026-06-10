import { useEffect, useMemo, useState } from 'react';
import {
  DropdownItem,
  DropdownLabel,
  DropdownMenu,
} from '@/components/ui/dropdown-menu';
import { ExpireChip } from '@/components/ui/expire-chip';

interface TimeOptions {
  value: number;
  label: string;
  shortLabel: string;
}

interface TimeSelectorProps {
  initialValue?: number | null;
  onChange: (minutes: number) => void;
}

const timeOptions: TimeOptions[] = [
  { value: 1,     label: '1 minute',     shortLabel: '1m'  },
  { value: 5,     label: '5 minutes',    shortLabel: '5m'  },
  { value: 30,    label: '30 minutes',   shortLabel: '30m' },
  { value: 60,    label: '1 hour',       shortLabel: '1h'  },
  { value: 1440,  label: '1 day',        shortLabel: '1d'  },
  { value: 10080, label: '7 days',       shortLabel: '7d'  },
  { value: 0,     label: 'No expiration', shortLabel: ''   },
];

const defaultTimeOption = timeOptions[6];
const findTimeOptionByValue = (value: number) =>
  timeOptions.find((opt) => opt.value === value) ?? defaultTimeOption;

const TimeSelector = ({ initialValue, onChange }: TimeSelectorProps) => {
  const [selectedOption, setSelectedOption] = useState<TimeOptions>(
    initialValue ? findTimeOptionByValue(initialValue) : defaultTimeOption
  );

  const expirationSelected = useMemo(
    () => selectedOption.value > 0,
    [selectedOption]
  );

  const handleOptionChange = (index: number) => {
    const opt = timeOptions[index];
    setSelectedOption(opt);
    onChange(opt?.value);
  };

  useEffect(() => {
    if (initialValue === undefined || initialValue === null) return;
    setSelectedOption(findTimeOptionByValue(initialValue));
  }, [initialValue]);

  return (
    <DropdownMenu
      trigger={
        <button
          type="button"
          className="flex items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 rounded-lg"
          aria-label="Set message expiration timer"
        >
          <ExpireChip
            label={expirationSelected ? selectedOption.shortLabel : undefined}
          />
        </button>
      }
      align="start"
    >
      <DropdownLabel>Message expiration timer</DropdownLabel>
      {timeOptions.map((option, index) => (
        <DropdownItem
          key={option.value}
          onSelect={() => handleOptionChange(index)}
        >
          {option.label}
        </DropdownItem>
      ))}
    </DropdownMenu>
  );
};

export default TimeSelector;
