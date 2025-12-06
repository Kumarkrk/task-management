// app/dashboard/page.tsx
"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, getAccessToken, logout } from "../../lib/api";

type Task = {
  id: number;
  title: string;
  completed: boolean;
  createdAt: string;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type TaskResponse = {
  data: Task[];
  pagination: Pagination;
};

export default function DashboardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"" | "completed" | "pending">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function ensureAuth() {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
    }
  }

  async function loadTasks(page = 1) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "10");
      if (search) params.set("search", search);
      if (status) params.set("status", status);

      const res = await apiFetch(`/tasks?${params.toString()}`, {}, true);
      const { data, pagination } = res as TaskResponse;
      setTasks(data);
      setPagination(pagination);
    } catch (err: any) {
      if (err.message === "Unauthorized") {
        router.replace("/login");
      } else {
        setError(err.message || "Failed to load tasks");
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    ensureAuth();
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleAddTask(e: FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setLoading(true);
      await apiFetch(
        "/tasks",
        {
          method: "POST",
          body: JSON.stringify({ title: newTitle }),
        },
        true
      );
      setNewTitle("");
      await loadTasks(pagination?.page || 1);
    } catch (err: any) {
      setError(err.message || "Failed to add task");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(id: number) {
    try {
      setLoading(true);
      await apiFetch(`/tasks/${id}/toggle`, { method: "PATCH" }, true);
      await loadTasks(pagination?.page || 1);
    } catch (err: any) {
      setError(err.message || "Failed to toggle task");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this task?")) return;
    try {
      setLoading(true);
      await apiFetch(`/tasks/${id}`, { method: "DELETE" }, true);
      await loadTasks(pagination?.page || 1);
    } catch (err: any) {
      setError(err.message || "Failed to delete task");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  function handleFilterApply(e: FormEvent) {
    e.preventDefault();
    loadTasks(1);
  }

  return (
    <main className="min-h-screen bg-gray-100">
      <header className="bg-white shadow px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Task Dashboard</h1>
        <button
          onClick={handleLogout}
          className="text-sm bg-red-500 text-white px-3 py-1 rounded"
        >
          Logout
        </button>
      </header>

      <section className="max-w-3xl mx-auto mt-6 px-4">
        {error && (
          <div className="mb-3 bg-red-50 text-red-700 text-sm p-2 rounded">
            {error}
          </div>
        )}

        {/* Add form */}
        <form onSubmit={handleAddTask} className="flex gap-2 mb-4">
          <input
            type="text"
            className="flex-1 border rounded px-3 py-2 text-sm"
            placeholder="New task title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
         style={{color:"black"}} />
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
          >
            Add
          </button>
        </form>

        {/* Filters */}
        <form
          onSubmit={handleFilterApply}
          className="flex flex-wrap gap-2 items-center mb-4"
        >
          <input
            type="text"
            className="flex-1 min-w-[120px] border rounded px-3 py-2 text-sm"
            placeholder="Search by title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
           style={{color:"black"}}/>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
          <button
            type="submit"
            className="bg-gray-800 text-white px-3 py-2 rounded text-sm"
          >
            Apply
          </button>
        </form>

        {/* Task list */}
        <div className="bg-white rounded shadow divide-y">
          {loading && tasks.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">Loading tasks...</p>
          ) : tasks.length === 0 ? (
            <p className="p-4 text-sm text-gray-500">No tasks found.</p>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <p style={{color:"black"}}
                    className={`text-sm ${
                      task.completed ? "line-through text-gray-500" : ""
                    }`}
                  >
                    {task.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(task.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleToggle(task.id)}
                    className="text-xs px-2 py-1 rounded border"
                  >
                    {task.completed ? "Mark Pending" : "Mark Done"}
                  </button>
                  <button
                    onClick={() => handleDelete(task.id)}
                    className="text-xs px-2 py-1 rounded border border-red-500 text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            <button
              disabled={pagination.page === 1 || loading}
              onClick={() => loadTasks(pagination.page - 1)}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40"
            >
              Prev
            </button>
            <span className="text-sm">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <button
              disabled={
                pagination.page === pagination.totalPages || loading
              }
              onClick={() => loadTasks(pagination.page + 1)}
              className="px-3 py-1 text-sm border rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
