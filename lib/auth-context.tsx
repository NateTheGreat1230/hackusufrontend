"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react"
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface AppUser extends FirebaseUser {
  first_name?: string
  last_name?: string
  role?: string
  company?: string
  phone?: string
}

interface AuthContextType {
  user: AppUser | null
  loading: boolean
  refetch: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  refetch: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchUserData = useCallback(async (firebaseUser: FirebaseUser) => {
    const userDocRef = doc(db, "users", firebaseUser.uid)
    const userSnap = await getDoc(userDocRef)

    if (userSnap.exists()) {
      setUser({
        ...firebaseUser,
        ...userSnap.data(),
      })
    } else {
      setUser(firebaseUser)
    }
  }, [])

  const refetch = useCallback(async () => {
    if (!auth.currentUser) return
    await fetchUserData(auth.currentUser)
  }, [fetchUserData])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
        await fetchUserData(firebaseUser)
      } catch (error) {
        console.error("Error fetching user:", error)
        setUser(firebaseUser)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [fetchUserData])

  return (
    <AuthContext.Provider value={{ user, loading, refetch }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
