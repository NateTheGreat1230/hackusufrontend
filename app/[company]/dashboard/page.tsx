"use client";

import { useAuth } from "@/lib/auth-context";

export default function DashboardPage() {
  const { user, loading } = useAuth()
  if (loading) {
    return <div>Loading...</div>
  }
  if (!user) {
    return <div>Please log in to access the dashboard.</div>
  }
  return (
    <div>
      <h1>Welcome to the Dashboard, {user.first_name} {user.last_name}!</h1>
      <p>This is your company dashboard where you can manage your account and view analytics.</p>
    </div>
  );
}