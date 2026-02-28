"use client"

import Link from "next/link"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"

import {
  Home,
  Folder,
  UserRound,
  NotebookText,
  Package,
  File,
  Settings,
  ClipboardList,
} from "lucide-react"

export function MainSidebar({ company }: { company: string }) {
  const { state } = useSidebar() // collapsed or expanded

  const navItems = [
    { title: "Dashboard", url: `/${company}/dashboard`, icon: Home },
    { title: "Customers", url: `/${company}/customers`, icon: UserRound },
    { title: "Tickets", url: `/${company}/tickets`, icon: NotebookText },
    { title: "Projects", url: `/${company}/projects`, icon: Folder },
    { title: "Products", url: `/${company}/products`, icon: Package },
    { title: "Manufacturing", url: `/${company}/manufacturing`, icon: ClipboardList },
    { title: "Invoices", url: `/${company}/invoices`, icon: File },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className={`py-4 ${state === "expanded" ? "px-4" : "px-0 flex items-center justify-center"}`}>
        <span className="font-semibold text-3xl border-b-4 border-green-500 inline-block pb-1">
          {state === "expanded" ? "enflo" : "e"}
        </span>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild tooltip={item.title} className={state === "collapsed" ? "justify-center" : ""}>
                  <Link href={item.url}>
                    <item.icon />
                    {state === "expanded" && (
                      <span>{item.title}</span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings" className={state === "collapsed" ? "justify-center" : ""}>
              <Link href="/settings">
                <Settings />
                {state === "expanded" && <span>Settings</span>}
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
