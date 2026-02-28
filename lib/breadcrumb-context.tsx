"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"

type TrailItem = { title: string; url: string }
type BreadcrumbContextType = {
  trail: TrailItem[]
  setCustomTitle: (title: string) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({ trail: [], setCustomTitle: () => {} })

const topLevelPaths = [
  "dashboard",
  "customers",
  "tickets",
  "projects",
  "products",
  "invoices",
  "settings",
  "profile"
]

export function BreadcrumbProvider({ children, company }: { children: React.ReactNode, company: string }) {
  const pathname = usePathname()
  const [trail, setTrail] = useState<TrailItem[]>([])
  const [mounted, setMounted] = useState(false)

  // Hydration safety
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted || !pathname) return
    
    const segments = pathname.split('/').filter(Boolean)
    if (segments.length < 2) return 

    const companySegment = segments[0]
    const routeType = segments[1]
    const id = segments.length > 2 ? segments[2] : null

    let currentTitle = routeType.charAt(0).toUpperCase() + routeType.slice(1)
    if (id) {
       currentTitle = id 
    }
    
    // eslint-disable-next-line react-hooks/exhaustive-deps
    const saved = sessionStorage.getItem(`breadcrumbs_${company}`)
    let startTrail: TrailItem[] = []
    
    // Only parse saved trail if current trail is empty (first route visit after mount)
    if (trail.length === 0 && saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) {
          startTrail = parsed
        }
      } catch (e) {
        // ignore
      }
    } else {
      startTrail = trail
    }

    let newTrail = [...startTrail]

    if (topLevelPaths.includes(routeType) && !id) {
       newTrail = [{ title: currentTitle, url: pathname }]
    } else {
       const existingIndex = newTrail.findIndex(item => item.url === pathname)
       if (existingIndex !== -1) {
          newTrail = newTrail.slice(0, existingIndex + 1)
       } else {
          if (newTrail.length === 0) {
             let baseTitle = routeType.charAt(0).toUpperCase() + routeType.slice(1)
             if (baseTitle === "Ticket") baseTitle = "Tickets"
             if (baseTitle === "Project") baseTitle = "Projects"
             if (baseTitle === "Customer") baseTitle = "Customers"
             if (baseTitle === "Invoice") baseTitle = "Invoices"
             if (baseTitle === "Product") baseTitle = "Products"
             
             newTrail = [
               { title: baseTitle, url: `/${companySegment}/${baseTitle.toLowerCase()}` },
               { title: currentTitle, url: pathname }
             ]
          } else {
             newTrail.push({ title: currentTitle, url: pathname })
          }
       }
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTrail(newTrail)
    sessionStorage.setItem(`breadcrumbs_${company}`, JSON.stringify(newTrail))
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, mounted, company])

  const setCustomTitle = (title: string) => {
    if (!pathname) return
    setTrail(prev => {
      const newTrail = [...prev]
      const lastIndex = newTrail.length - 1
      if (lastIndex >= 0 && newTrail[lastIndex].url === pathname) {
        if (newTrail[lastIndex].title !== title) {
          newTrail[lastIndex].title = title
          sessionStorage.setItem(`breadcrumbs_${company}`, JSON.stringify(newTrail))
          return newTrail
        }
      }
      return prev
    })
  }

  return (
    <BreadcrumbContext.Provider value={{ trail: mounted ? trail : [], setCustomTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbContext)
}
