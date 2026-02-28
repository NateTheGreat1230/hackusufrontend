"use client"

import { useEffect, useState } from "react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import {
  Building2,
  Users,
  Mail,
  Shield,
  Trash2,
  X,
  Check,
  Pen,
} from "lucide-react"
import { DataTable } from "@/components/DataTable"
import { useAuth } from "@/lib/auth-context"
import { collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { User } from "@/types"

export default function AdminSettingsPage() {
  const { user } = useAuth()

  const [company, setCompany] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const companyId = user?.company?.id || ""
  const [members, setMembers] = useState<User[]>([])
  const [loadingMembers, setLoadingMembers] = useState(false)


  useEffect(() => {
    if (!user?.company) return

    getDoc(doc(db, "companies", companyId)).then((snap) => {
        
      if (!snap.exists()) return

      const data = snap.data()

      setCompany({ id: snap.id, ...data })

      setEditForm({
        name: data.name || "",
        description: data.description || "",
      })
    }).catch((err) => {
      console.error("Error loading company:", err)
    })
  }, [user])

  useEffect(() => {
    if (!companyId) return

    const loadMembers = async () => {
      try {
        setLoadingMembers(true)
        const q = query(
          collection(db, "users"),
          where("company", "==", user?.company)
        )
        const snap = await getDocs(q)
        const results = snap.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as User[]
        setMembers(results)
      } catch (err) {
        console.error("Error loading users:", err)
      } finally {
        setLoadingMembers(false)
      }
    }

    loadMembers()
  }, [companyId])

  if (!company || !editForm) return null

  const resetForm = () => {
    setEditForm({
      name: company.name || "",
      description: company.description || "",
    })
  }

  const handleSave = async () => {
    if (!user?.company) return

    try {
      setSaving(true)

      await updateDoc(doc(db, "companies", companyId), {
        name: editForm.name,
        description: editForm.description,
        time_updated: serverTimestamp(),
      })

      setCompany({
        ...company,
        name: editForm.name,
        description: editForm.description,
      })

      setIsEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const memberColumns = [
    {
      header: "Name",
      key: "name",
      render: (member: User) => (
        <div>
          <div className="font-medium">
            {member.first_name} {member.last_name}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <Mail className="w-3 h-3" />
            {member.email}
          </div>
        </div>
      ),
    },
    {
      header: "Role",
      key: "role",
      className: "w-40",
      render: (member: User) => (
        <div className="flex items-center gap-2 text-sm">
          <Shield className="w-4 h-4 text-muted-foreground" />
          <span className="capitalize">{member.user_role}</span>
        </div>
      ),
    },
    {
      header: "",
      key: "actions",
      className: "w-32 text-right",
      render: () => (
        <Button variant="destructive" size="sm">
          <Trash2 className="w-4 h-4 mr-1" />
          Remove
        </Button>
      ),
    },
  ]

  if (user?.user_role !== "admin") {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Card className="w-[400px]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center">
              <Shield className="w-5 h-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            You do not have permission to access this page.
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-muted/10">
      <div className="flex-1 p-8 overflow-y-auto w-full">
        <div className="max-w-5xl mx-auto space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Admin Settings
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your company and team members
            </p>
          </div>

          {/* Company Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Company Information
              </CardTitle>

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
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>

                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {saving ? "Saving..." : "Save"}
                    </Button>
                  </>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pen className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">

              {/* Company Name */}
              {isEditing ? (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Company Name
                  </div>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        name: e.target.value,
                      })
                    }
                  />
                </div>
              ) : (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Company Name
                  </div>
                  <div className="font-medium">
                    {company.name || "—"}
                  </div>
                </div>
              )}

              {/* Description */}
              {isEditing ? (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground">
                    Description
                  </div>
                  <Input
                    value={editForm.description}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        description: e.target.value,
                      })
                    }
                  />
                </div>
              ) : (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">
                    Description
                  </div>
                  <div className="font-medium">
                    {company.description || "—"}
                  </div>
                </div>
              )}

            </CardContent>
          </Card>
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Team Members
            </h2>
            <p className="text-muted-foreground mt-1 mb-4">
              Manage your team members and their roles
            </p>
              <DataTable
                columns={memberColumns}
                data={members}
                emptyMessage="No team members found."
              />
          </div>
        </div>
      </div>
    </div>
  )
}
