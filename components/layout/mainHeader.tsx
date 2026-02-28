"use client"

import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"

import { Bell, User } from "lucide-react"
import { usePathname } from "next/navigation"

// 1. IMPORT YOUR NEW COMPONENT HERE (Adjust the path if needed)
import { GlobalSearch } from "./globalSearch" 

export function MainHeader({ company }: { company: string }) {
  const pathname = usePathname()

  function getTitle() {
    if (pathname === `/${company}/dashboard`) return "Dashboard"
    if (pathname === `/${company}/projects`) return "Projects"
    if (pathname === `/${company}/analytics`) return "Analytics"
    if (pathname === `/${company}/customers`) return "Customers"
    if (pathname === `/${company}/tickets`) return "Tickets"
    if (pathname === `/${company}/products`) return "Products"
    if (pathname === `/${company}/invoices`) return "Invoices"
    if (pathname === `/${company}/settings`) return "Company Settings"
    if (pathname === `/${company}/profile`) return "User Profile"
    return "My App"
  }

  return (
    <header className="h-14 border-b flex items-center px-4 justify-between gap-4">
      
      {/* LEFT SIDE - Added flex-1 so it takes up equal space */}
      <div className="flex items-center gap-4 flex-1">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold whitespace-nowrap">
          {getTitle()}
        </h1>
      </div>

      {/* CENTER - THE SEARCH BAR */}
      <div className="flex-1 max-w-xl hidden md:block">
        <GlobalSearch />
      </div>

      {/* RIGHT SIDE - Added flex-1 and justify-end to balance the left side */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </header>
  )
}