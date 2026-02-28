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
} from "lucide-react"

export function MainSidebar({ company }: { company: string }) {
  const { state } = useSidebar() // collapsed or expanded

  const navItems = [
    { title: "Dashboard", url: `/${company}/dashboard`, icon: Home },
    { title: "Customers", url: `/${company}/customers`, icon: UserRound },
    { title: "Tickets", url: `/${company}/tickets`, icon: NotebookText },
    { title: "Projects", url: `/${company}/projects`, icon: Folder },
    { title: "Products", url: `/${company}/products`, icon: Package },
    { title: "Invoices", url: `/${company}/invoices`, icon: File },
  ]

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-4 py-2">
        {state === "expanded" && <span className="font-semibold text-3xl">enflo</span>}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
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
            <SidebarMenuButton asChild>
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
