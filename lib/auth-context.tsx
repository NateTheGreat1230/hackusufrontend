"use client"

import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth"
import { doc, getDoc } from "firebase/firestore"
import { auth, db } from "@/lib/firebase"

interface AppUser extends FirebaseUser {
  first_name?: string
  last_name?: string
  company?: string
  role?: string
}

interface AuthContextType {
  user: AppUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null)
        setLoading(false)
        return
      }

      try {
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
      } catch (error) {
        console.error("Error fetching user document:", error)
        setUser(firebaseUser)
      }

      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
