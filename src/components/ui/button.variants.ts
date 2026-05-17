import { cva } from "class-variance-authority";

export const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-medium rounded-md transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-40",
    "cursor-pointer select-none",
  ],
  {
    variants: {
      intent: {
        primary:   "bg-indigo-600 text-white hover:bg-indigo-500 active:bg-indigo-700 focus-visible:ring-indigo-500",
        secondary: "bg-zinc-800 text-zinc-100 border border-zinc-700 hover:bg-zinc-700 focus-visible:ring-zinc-500",
        danger:    "bg-red-600 text-white hover:bg-red-500 active:bg-red-700 focus-visible:ring-red-500",
        ghost:     "bg-transparent text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:ring-zinc-500",
        link:      "bg-transparent text-indigo-400 underline-offset-4 hover:underline hover:text-indigo-300 p-0 h-auto",
      },
      size: {
        sm:   "h-8 px-3 text-sm",
        md:   "h-10 px-4 text-sm",
        lg:   "h-12 px-6 text-base",
        icon: "h-10 w-10 p-0", // square, icon-only — always pair with aria-label
      },
    },
    defaultVariants: {
      intent: "primary",
      size:   "md",
    },
  }
);