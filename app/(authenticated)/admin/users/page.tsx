"use server"

import { Suspense } from "react"
import { UsersList } from "./_components/users-list"
import { UsersListSkeleton } from "./_components/users-list-skeleton"

export default async function AdminUsersPage() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">User Management</h1>
      </div>
      <Suspense fallback={<UsersListSkeleton />}>
        <UsersList />
      </Suspense>
    </div>
  )
}

