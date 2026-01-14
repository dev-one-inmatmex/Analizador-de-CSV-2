import * as React from "react"
import { cn } from "@/lib/utils"
import { CheckCircle } from "lucide-react"

const List = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => {
  return (
    <ul
      ref={ref}
      className={cn("flex flex-col gap-3", className)}
      {...props}
    />
  )
})
List.displayName = "List"

const ListItem = React.forwardRef<
  HTMLLIElement,
  React.LiHTMLAttributes<HTMLLIElement>
>(({ className, children, ...props }, ref) => {
  return (
    <li
      ref={ref}
      className={cn("flex items-start gap-2 text-sm", className)}
      {...props}
    >
      <CheckCircle className="mt-1 h-4 w-4 shrink-0 text-primary" />
      <span className="flex-1">{children}</span>
    </li>
  )
})
ListItem.displayName = "ListItem"

export { List, ListItem }
