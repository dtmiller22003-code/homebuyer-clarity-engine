"use client";

import { useMemo, useState, useTransition } from "react";
import {
  setDefaultAssignee,
  updateTeamMember,
} from "@/app/actions/settings";

interface TeamMemberVM {
  id: string;
  displayName: string;
  email: string;
  phone: string | null;
  slug: string | null;
  bio: string | null;
  role: "admin" | "agent" | "loan_officer";
  applicationLink: string | null;
}

export function TeamSettingsClient({
  members,
  defaultAssigneeId,
}: {
  members: TeamMemberVM[];
  defaultAssigneeId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [rows, setRows] = useState(members);
  const [assigneeId, setAssigneeId] = useState(defaultAssigneeId ?? "");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const baseUrl = useMemo(() => {
    if (typeof window !== "undefined") return window.location.origin;
    return "https://your-domain.com";
  }, []);

  const saveMember = (member: TeamMemberVM) => {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await updateTeamMember({
        memberId: member.id,
        displayName: member.displayName,
        phone: member.phone ?? null,
        slug: member.slug ?? null,
        bio: member.bio ?? null,
        role: member.role,
        applicationLink: member.applicationLink?.trim()
          ? member.applicationLink.trim()
          : null,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(`Saved ${member.displayName}.`);
    });
  };

  const saveDefaultAssignee = () => {
    if (!assigneeId) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const res = await setDefaultAssignee(assigneeId);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("Default assignee updated.");
    });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-surface-200 bg-white p-5">
        <h2 className="text-lg font-semibold text-surface-900">Default assignee</h2>
        <p className="text-sm text-surface-600 mt-1">
          Public /apply submissions route here when no LO slug is used.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="rounded-md border border-surface-300 px-3 py-2 text-sm min-w-[260px]"
          >
            {rows.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} ({m.role})
              </option>
            ))}
          </select>
          <button
            onClick={saveDefaultAssignee}
            disabled={pending || !assigneeId}
            className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            Save default assignee
          </button>
        </div>
      </section>

      <section className="rounded-lg border border-surface-200 bg-white p-5 overflow-x-auto">
        <h2 className="text-lg font-semibold text-surface-900">Team members</h2>
        <p className="text-sm text-surface-600 mt-1">
          Edit display name, phone, slug, bio, role, and loan officer application
          URL. Public lead links use{" "}
          <code className="text-xs bg-surface-100 px-1 rounded">/apply/lo/…</code>
          .
        </p>

        <table className="mt-4 w-full min-w-[1100px] text-sm">
          <thead>
            <tr className="text-left text-surface-600 border-b border-surface-200">
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">Email</th>
              <th className="py-2 pr-2">Phone</th>
              <th className="py-2 pr-2">Role</th>
              <th className="py-2 pr-2">Slug</th>
              <th className="py-2 pr-2">Public lead link</th>
              <th className="py-2 pr-2">Application link</th>
              <th className="py-2 pr-2">Bio</th>
              <th className="py-2 pr-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((member, idx) => (
              <tr key={member.id} className="border-b border-surface-100 align-top">
                <td className="py-2 pr-2">
                  <input
                    value={member.displayName}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...member, displayName: e.target.value };
                      setRows(next);
                    }}
                    className="w-44 rounded border border-surface-300 px-2 py-1.5"
                  />
                </td>
                <td className="py-2 pr-2 text-surface-700">{member.email}</td>
                <td className="py-2 pr-2">
                  <input
                    value={member.phone ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...member, phone: e.target.value || null };
                      setRows(next);
                    }}
                    className="w-36 rounded border border-surface-300 px-2 py-1.5"
                  />
                </td>
                <td className="py-2 pr-2">
                  <select
                    value={member.role}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = {
                        ...member,
                        role: e.target.value as TeamMemberVM["role"],
                      };
                      setRows(next);
                    }}
                    className="rounded border border-surface-300 px-2 py-1.5"
                  >
                    <option value="admin">admin</option>
                    <option value="loan_officer">loan officer</option>
                    <option value="agent">agent (legacy)</option>
                  </select>
                </td>
                <td className="py-2 pr-2">
                  <input
                    value={member.slug ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = {
                        ...member,
                        slug: e.target.value.toLowerCase() || null,
                      };
                      setRows(next);
                    }}
                    className="w-40 rounded border border-surface-300 px-2 py-1.5"
                  />
                  <p className="mt-1 text-[11px] text-red-700">
                    Changing this will break any shared links using the old slug.
                  </p>
                </td>
                <td className="py-2 pr-2">
                  {member.slug ? (
                    <div className="space-y-1">
                      <div className="text-xs text-surface-600 break-all">
                        {`${baseUrl}/apply/lo/${member.slug}`}
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await navigator.clipboard.writeText(
                            `${baseUrl}/apply/lo/${member.slug}`,
                          );
                          setMessage(`Copied public lead link for ${member.displayName}.`);
                        }}
                        className="text-xs text-brand hover:underline"
                      >
                        Copy
                      </button>
                    </div>
                  ) : (
                    <span className="text-xs text-surface-400">No slug</span>
                  )}
                </td>
                <td className="py-2 pr-2">
                  {member.role === "loan_officer" || member.role === "agent" ? (
                    <input
                      value={member.applicationLink ?? ""}
                      onChange={(e) => {
                        const next = [...rows];
                        next[idx] = {
                          ...member,
                          applicationLink: e.target.value || null,
                        };
                        setRows(next);
                      }}
                      placeholder="https://…"
                      className="w-56 rounded border border-surface-300 px-2 py-1.5 text-xs"
                    />
                  ) : (
                    <span className="text-xs text-surface-400">—</span>
                  )}
                </td>
                <td className="py-2 pr-2">
                  <textarea
                    value={member.bio ?? ""}
                    onChange={(e) => {
                      const next = [...rows];
                      next[idx] = { ...member, bio: e.target.value || null };
                      setRows(next);
                    }}
                    rows={3}
                    className="w-64 rounded border border-surface-300 px-2 py-1.5"
                  />
                </td>
                <td className="py-2 pr-2">
                  <button
                    type="button"
                    onClick={() => saveMember(rows[idx])}
                    disabled={pending}
                    className="rounded-md bg-brand px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                  >
                    Save
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-green-700">{message}</p> : null}
    </div>
  );
}
