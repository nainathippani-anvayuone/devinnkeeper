import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-[#8B6748] text-white shadow-[0_10px_25px_rgba(139,103,72,0.25)] hover:-translate-y-0.5 hover:bg-[#7A5A3C] active:bg-[#6B4F34]",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/20",
        outline:
          "border border-[#C4A882] bg-[#F3EDE4] text-[#8B6748] shadow-xs hover:bg-[#E8DED2] hover:border-[#8B6748]",
        secondary:
          "bg-[#E8DED2] text-[#3F352D] hover:bg-[#DDD3C7] border border-[#C4A882]",
        ghost:
          "text-[#8B6748] hover:bg-[#F3EDE4] hover:text-[#7A5A3C]",
        link: "text-[#8B6748] underline-offset-4 hover:underline hover:text-[#7A5A3C]",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-lg gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-xl px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
