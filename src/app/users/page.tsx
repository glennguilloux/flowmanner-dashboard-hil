import { getUsers } from "@/lib/data";
import { Mail, UserCircle } from "lucide-react";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950 dark:text-slate-50">Users</h1>
        <p className="text-slate-600 dark:text-slate-400">
          Registered operators with access to the loop. Each email is the unique
          key for a user.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:bg-slate-900 shadow-sm">
        {users.map((user, i) => (
          <div
            key={user.id}
            className={[
              "flex items-center gap-4 px-6 py-4",
              i === 0 ? "" : "border-t border-slate-100 dark:border-slate-800",
            ].join(" ")}
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100">
              <UserCircle className="h-6 w-6 text-indigo-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {user.name}
              </p>
              <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500 dark:text-slate-400">
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{user.email}</span>
              </p>
            </div>
            <span className="hidden shrink-0 rounded-md bg-slate-100 dark:bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-600 sm:block">
              {user.role}
            </span>
            <span className="hidden shrink-0 text-xs text-slate-400 md:block">
              Joined {format(user.createdAt, "d MMM yyyy")}
            </span>
          </div>
        ))}
        {users.length === 0 && (
          <p className="px-6 py-8 text-sm text-slate-500 dark:text-slate-400">
            No users yet — load demo data from the dashboard.
          </p>
        )}
      </div>
    </div>
  );
}
