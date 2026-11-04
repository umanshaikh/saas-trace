import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "brand";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles =
      "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";

    const variantStyles = {
      default: "bg-indigo-600 text-white shadow hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500",
      brand: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md hover:from-indigo-500 hover:to-violet-500",
      destructive: "bg-rose-600 text-white shadow-sm hover:bg-rose-700 dark:bg-rose-700 dark:hover:bg-rose-600",
      outline: "border border-border bg-transparent shadow-sm hover:bg-accent hover:text-accent-foreground",
      secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
      ghost: "hover:bg-accent hover:text-accent-foreground",
      link: "text-indigo-600 underline-offset-4 hover:underline dark:text-indigo-400",
    };

    const sizeStyles = {
      default: "h-9 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-11 rounded-lg px-8 text-base",
      icon: "h-9 w-9",
    };

    return (
      <button
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
