import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const bubbleVariants = cva(
  "relative flex w-fit min-w-0 max-w-full flex-col rounded-2xl px-3.5 py-2.5 text-sm leading-6 ring-1 ring-foreground/8",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground",
        muted: "bg-muted text-foreground",
        tinted: "bg-primary text-primary-foreground ring-primary/20",
        outline: "bg-background text-foreground ring-border",
      },
      align: {
        start: "rounded-bl-md",
        end: "rounded-br-md",
      },
    },
    defaultVariants: {
      variant: "default",
      align: "start",
    },
  }
)

function Bubble({
  variant = "default",
  align = "start",
  className,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof bubbleVariants>) {
  return <div data-slot="bubble" data-variant={variant} data-align={align} className={cn(bubbleVariants({ variant, align }), className)} {...props} />
}

function BubbleContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="bubble-content" className={cn("w-fit max-w-full min-w-0 whitespace-pre-wrap break-words", className)} {...props} />
}

export { Bubble, BubbleContent, bubbleVariants }
