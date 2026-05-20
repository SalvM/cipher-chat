import { motion } from 'framer-motion';

interface TypingIndicatorProps {
  users: string[];
}

const TypingIndicator = ({ users }: TypingIndicatorProps) => {
  if (!users.length) return null;

  const label =
    users.length === 0
      ? ''
      : users.length === 1
        ? `${users[0]} is typing...`
        : users.length === 2
          ? `${users[0]} and ${users[1]} are typing...`
          : `${users[0]} and others are typing...`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-center gap-2 px-4 py-2"
    >
      <div className="flex gap-1">
        {[0, 150, 300].map((delay) => (
          <span
            key={delay}
            className="w-2 h-2 bg-text-primary rounded-full animate-bounce"
            style={{ animationDelay: `${delay}ms` }}
          />
        ))}
      </div>
      <span className="text-sm text-slate-400">{label}</span>
    </motion.div>
  );
};

export default TypingIndicator;
