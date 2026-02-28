"use client"

import { useEffect, useState } from "react"
import { doc, updateDoc } from "firebase/firestore"
import { db, auth } from "@/lib/firebase"
import { updateProfile } from "firebase/auth"

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  User,
  Mail,
  Pen,
  Check,
  X,
} from "lucide-react"

import { useAuth } from "@/lib/auth-context"

export default function ProfilePage() {
  const { user, loading, refetch } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<any>(null)

  // initialize editable state from user
  useEffect(() => {
    if (user) {
      setEditForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
      })
    }
  }, [user])

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground flex h-full items-center justify-center">
        Loading your profile...
      </div>
    )
  }

  if (!user || !editForm) return null

  const resetForm = () => {
    setEditForm({
      first_name: user.first_name || "",
      last_name: user.last_name || "",
      phone: user.phone || "",
    })
  }

  const handleSave = async () => {
    const userRef = doc(db, "users", user.uid)

    await updateDoc(userRef, {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      phone: editForm.phone,
    })

    if (auth.currentUser) {
      await updateProfile(auth.currentUser, {
        displayName: `${editForm.first_name} ${editForm.last_name}`,
      })
    }

    await refetch()

    setIsEditing(false)
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/10">
      <div className="flex-1 p-8 overflow-y-auto w-full">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {user.first_name} {user.last_name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Your Profile
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      resetForm()
                      setIsEditing(false)
                    }}
                  >
                    <X className="w-4 h-4 mr-2" /> Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Check className="w-4 h-4 mr-2" /> Save
                  </Button>
                </>
              ) : (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                >
                  <Pen className="w-4 h-4 mr-2" /> Edit Profile
                </Button>
              )}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">

                {isEditing ? (
                  <>
                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground mb-1">
                        First Name
                      </div>
                      <Input
                        value={editForm.first_name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            first_name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="text-xs text-muted-foreground mb-1">
                        Last Name
                      </div>
                      <Input
                        value={editForm.last_name}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            last_name: e.target.value,
                          })
                        }
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        First Name
                      </div>
                      <div className="font-medium">
                        {editForm.first_name || "—"}
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        Last Name
                      </div>
                      <div className="font-medium">
                        {editForm.last_name || "—"}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Contact */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Contact
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">

                {/* Email always read-only */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Email
                  </div>
                  <div className="font-medium">{user.email}</div>
                </div>

                {isEditing ? (
                  <div className="space-y-2">
                    <div className="text-xs text-muted-foreground mb-1">
                      Phone
                    </div>
                    <Input
                      value={editForm.phone}
                      onChange={(e) =>
                        setEditForm({
                          ...editForm,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>
                ) : (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">
                      Phone
                    </div>
                    <div className="font-medium">
                      {editForm.phone || "No phone number"}
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  )
}
