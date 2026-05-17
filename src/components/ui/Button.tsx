import { Slot } from "@radix-ui/react-slot";
import { type VariantProps } from "class-variance-authority";
import { cn } from "@/utils";
import { buttonVariants } from "./button.variants";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  // asChild: renders the first child element instead of <button>
  // use when the trigger is semantically a link or another element
  asChild?: boolean;
}

export function Button({ className, intent, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ intent, size }), className)} {...props} />;
}