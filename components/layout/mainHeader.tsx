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
import Link from "next/link"

import { Bell, User, ChevronDown, ChevronRight } from "lucide-react"

import { GlobalSearch } from "./globalSearch" 
import { useBreadcrumbs } from "@/lib/breadcrumb-context"

export function MainHeader({ company }: { company: string }) {
  const { trail } = useBreadcrumbs()

  return (
    <header className="h-14 border-b flex items-center px-4 justify-between gap-4">
      
      {/* LEFT SIDE */}
      <div className="flex items-center gap-4 flex-1 overflow-hidden">
        <SidebarTrigger />
        <div className="flex items-center text-sm ml-2 overflow-hidden whitespace-nowrap">
          {trail && trail.length > 0 ? (
            trail.map((item, index) => {
              const isLast = index === trail.length - 1;
              
              // Instantly clean up any messy 20-character IDs without a loading spinner
              const isMessyId = item.title.length === 20 && !item.title.includes(" ");
              const displayText = isMessyId ? item.title.substring(0, 8).toUpperCase() : item.title;
              
              return (
                <div key={item.url} className="flex items-center">
                  {index > 0 && <ChevronRight className="w-4 h-4 mx-1 md:mx-2 text-muted-foreground flex-shrink-0" />}
                  
                  <Link 
                    href={item.url}
                    className={`hover:underline truncate max-w-[120px] sm:max-w-[200px] ${isLast ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                    title={displayText}
                  >
                    {displayText}
                  </Link>
                </div>
              )
            })
          ) : (
             <span className="font-semibold text-foreground">My App</span>
          )}
        </div>
      </div>

      {/* CENTER - THE SEARCH BAR */}
      <div className="flex-1 max-w-xl hidden md:block">
        <GlobalSearch />
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="rounded-full h-9 px-2 gap-1 flex items-center cursor-pointer">
              <div className="rounded-full bg-primary/10 p-1 flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground mr-1" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem asChild>
              <Link
                href={`/${company}/profile`}
                className="cursor-pointer w-full"
              >
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Billing</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-500 cursor-pointer">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

    </header>
  )
}