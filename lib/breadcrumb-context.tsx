"use client"

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react"
import { usePathname } from "next/navigation"

type TrailItem = { title: string; url: string }
type BreadcrumbContextType = {
  trail: TrailItem[]
  setCustomTitle: (title: string, specificUrl?: string) => void
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
  const pathnameRef = useRef(pathname)
  const [trail, setTrail] = useState<TrailItem[]>([])
  const [mounted, setMounted] = useState(false)

  const customTitlesRef = useRef<Record<string, string>>({})

  useEffect(() => {
    pathnameRef.current = pathname
  }, [pathname])

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
    
    // Override with any registered custom title
    if (customTitlesRef.current[pathname]) {
      currentTitle = customTitlesRef.current[pathname]
    }

    const saved = sessionStorage.getItem(`breadcrumbs_${company}`)
    let startTrail: TrailItem[] = []
    
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

    // Enforce strict topological breadcrumbs instead of an endless history stack
    let baseTitle = routeType.charAt(0).toUpperCase() + routeType.slice(1)
    if (baseTitle === "Ticket") baseTitle = "Tickets"
    if (baseTitle === "Project") baseTitle = "Projects"
    if (baseTitle === "Customer") baseTitle = "Customers"
    if (baseTitle === "Invoice") baseTitle = "Invoices"
    if (baseTitle === "Product") baseTitle = "Products"

    if (topLevelPaths.includes(routeType) && !id) {
       newTrail = [{ title: currentTitle, url: pathname }]
    } else if (id) {
       // Deep page (e.g., ticket/123)
       newTrail = [
         { title: baseTitle, url: `/${companySegment}/${baseTitle.toLowerCase()}` },
         { title: currentTitle, url: pathname }
       ]
    } else {
       newTrail = [{ title: currentTitle, url: pathname }]
    }

    // Recover custom titles for these exact URLs if they exist in startTrail or customTitlesRef
    newTrail = newTrail.map((item) => {
       if (customTitlesRef.current[item.url]) {
          return { ...item, title: customTitlesRef.current[item.url] }
       }
       const historicMatch = startTrail.find(h => h.url === item.url)
       if (historicMatch && historicMatch.title !== item.url.split('/').pop() && historicMatch.title !== item.title) {
          return { ...item, title: historicMatch.title }
       }
       return item;
    })

    setTrail(newTrail)
    sessionStorage.setItem(`breadcrumbs_${company}`, JSON.stringify(newTrail))
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, mounted, company])

  const setCustomTitle = useCallback((title: string, specificUrl?: string) => {
    const targetUrl = specificUrl || pathnameRef.current;
    
    if (!targetUrl) return;

    customTitlesRef.current[targetUrl] = title;

    setTrail(prev => {
      const newTrail = [...prev]
      const index = newTrail.findIndex(t => t.url === targetUrl)
      if (index >= 0) {
        if (newTrail[index].title !== title) {
          newTrail[index].title = title
          sessionStorage.setItem(`breadcrumbs_${company}`, JSON.stringify(newTrail))
          return newTrail
        }
      }
      return prev
    })
  }, [company])

  return (
    <BreadcrumbContext.Provider value={{ trail: mounted ? trail : [], setCustomTitle }}>
      {children}
    </BreadcrumbContext.Provider>
  )
}

export function useBreadcrumbs() {
  return useContext(BreadcrumbContext)
}
