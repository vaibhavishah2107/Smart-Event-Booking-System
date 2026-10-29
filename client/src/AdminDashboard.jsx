
import { useEffect, useState } from "react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

const emptyEvent = {
  title: "",
  description: "",
  location: "",
  date: "",
  total_seats: 100,
  price: 499,
  img: "",
};

export default function AdminDashboard({ onBack }) {
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [events, setEvents] = useState([]);
  const [form, setForm] = useState(emptyEvent);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function request(path, options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "x-admin-key": adminKey,
        ...options.headers,
      },
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed (${response.status})`);
    }

    return data;
  }

  async function loadEvents() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/events`);
      if (!response.ok) throw new Error("Could not load events.");

      const data = await response.json();
      setEvents(Array.isArray(data) ? data : data.events || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

async function login(event) {
  event.preventDefault();
  setError("");
  setMessage("");

  const key = adminKey.trim();

  if (!key) {
    setError("Please enter your password.");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/api/admin/verify`, {
      method: "GET",
      headers: {
        "x-admin-key": key,
      },
    });

    const result = await response.json().catch(() => ({}));

    if (response.status === 401 || response.status === 403) {
      throw new Error(
        "Incorrect admin password."
      );
    }

    if (!response.ok) {
      throw new Error(
        result.message || `Verification failed (${response.status}).`
      );
    }

    setAdminKey(key);
    setAuthenticated(true);
    setMessage("Admin access verified successfully.");

    const data = await fetchEvents();
    setEvents(Array.isArray(data) ? data : data.events || []);
  } catch (err) {
    setError(
      err.message || "Could not connect to the Events."
    );
  }
}
  function editEvent(event) {
    setEditingId(event.id);
    setForm({
      title: event.title || "",
      description: event.description || "",
      location: event.location || "",
      date: event.date
        ? String(event.date).replace("T", " ").slice(0, 16)
        : "",
      total_seats: event.total_seats ?? 100,
      price: event.price ?? 0,
      img: event.img || "",
    });
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveEvent(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    try {
      const payload = {
        ...form,
        total_seats: Number(form.total_seats),
        price: Number(form.price),
        date: form.date.replace("T", " "),
      };

      const result = await request(
        editingId ? `/api/events/${editingId}` : "/api/events",
        {
          method: editingId ? "PUT" : "POST",
          body: JSON.stringify(payload),
        }
      );

      setMessage(result.message || "Event saved successfully!");
      setForm(emptyEvent);
      setEditingId(null);
      await loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deleteEvent(event) {
    if (!window.confirm(`Delete "${event.title}"?`)) return;

    setError("");
    setMessage("");

    try {
      const result = await request(`/api/events/${event.id}`, {
        method: "DELETE",
      });

      setMessage(result.message || "Event deleted successfully.");
      await loadEvents();
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    if (authenticated) loadEvents();
  }, [authenticated]);

  if (!authenticated) {
    return (
      <main className="min-h-screen bg-slate-950 px-5 py-20 text-white">
        <div className="mx-auto max-w-md animate-[fadeIn_.5s_ease-out] rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl">
          <button onClick={onBack} className="mb-8 text-sm text-blue-300">
            ← Back to website
          </button>

          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl">
            🔐
          </div>

          <h1 className="text-3xl font-black">Admin access</h1>
          <p className="mt-3 text-sm leading-6 text-slate-300">
            Enter the admin password
          </p>

          <form onSubmit={login} className="mt-7 space-y-4">
            <input
              type="password"
              required
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              placeholder="Admin API key"
              className="w-full rounded-xl border border-white/10 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
            />

            {error && (
              <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}

            <button className="w-full rounded-xl bg-blue-600 py-3 font-bold transition hover:bg-blue-500">
              Open dashboard →
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-8">
      <div className="mx-auto max-w-7xl animate-[fadeIn_.5s_ease-out]">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase tracking-[.2em] text-blue-400">
              Infosystem · Control center
            </p>
            <h1 className="mt-2 text-3xl font-black sm:text-4xl">
              Admin Dashboard
            </h1>
            <p className="mt-2 text-slate-400">
              Manage events.
            </p>
          </div>
          <button
            onClick={() => {
              setAuthenticated(false);
              setAdminKey("");
              onBack();
            }}
            className="rounded-full border border-white/15 px-5 py-3 transition hover:bg-white/10"
          >
            ← Client website
          </button>
        </header>
        <section className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            ["Total events", events.length],
            ["Total seats", events.reduce((sum, e) => sum + Number(e.total_seats || 0), 0)],
            ["Available seats", events.reduce((sum, e) => sum + Number(e.available_seats || 0), 0)],
          ].map(([label, value]) => (
            <article
              key={label}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 transition duration-300 hover:-translate-y-1 hover:border-blue-400/50"
            >
              <p className="text-sm text-slate-400">{label}</p>
              <p className="mt-3 text-3xl font-black">{value}</p>
            </article>
          ))}
        </section>
        <section className="grid items-start gap-8 lg:grid-cols-[.85fr_1.15fr]">
          <form
            onSubmit={saveEvent}
            className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <h2 className="text-2xl font-black">
              {editingId ? "Edit event" : "Create event"}
            </h2>
            <input
              required
              maxLength={255}
              placeholder="Event title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="admin-input"
            />
            <textarea
              rows={3}
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="admin-input"
            />
            <input
              required
              placeholder="Location"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="admin-input"
            />
            <label className="block text-sm text-slate-300">
              Event date and time
              <input
                required
                type="datetime-local"
                value={form.date.replace(" ", "T")}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="admin-input mt-2"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-slate-300">
                Total seats
                <input
                  required
                  min="0"
                  type="number"
                  value={form.total_seats}
                  onChange={(e) => setForm({ ...form, total_seats: e.target.value })}
                  className="admin-input mt-2"
                />
              </label>
              <label className="text-sm text-slate-300">
                Price (₹)
                <input
                  required
                  min="0"
                  step="0.01"
                  type="number"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="admin-input mt-2"
                />
              </label>
            </div>
            <input
              type="url"
              placeholder="Event image URL (optional)"
              value={form.img}
              onChange={(e) => setForm({ ...form, img: e.target.value })}
              className="admin-input"
            />
            {error && (
              <p role="alert" className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">
                {error}
              </p>
            )}
            {message && (
              <p role="status" className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
                {message}
              </p>
            )}
            <div className="flex flex-wrap gap-3">
              <button className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-bold transition hover:bg-blue-500">
                {editingId ? "Save changes" : "+ Create event"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null);
                    setForm(emptyEvent);
                  }}
                  className="rounded-xl border border-white/15 px-4 py-3"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-2xl font-black">Manage events</h2>
              <button onClick={loadEvents} className="text-sm font-bold text-blue-300">
                ↻ Refresh
              </button>
            </div>
            {loading ? (
              <p className="animate-pulse py-10 text-slate-400">Loading events…</p>
            ) : events.length === 0 ? (
              <p className="py-10 text-slate-400">No events found. Create your first event.</p>
            ) : (
              <div className="space-y-3">
                {events.map((event) => (
                  <article
                    key={event.id}
                    className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 transition duration-300 hover:border-blue-400/40"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-bold">{event.title}</h3>
                        <p className="mt-1 text-sm text-slate-400">
                          {event.location} · ₹{event.price}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {event.available_seats} / {event.total_seats} seats available
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <button
                          onClick={() => editEvent(event)}
                          className="rounded-lg bg-blue-500/15 px-3 py-2 text-sm font-bold text-blue-300 hover:bg-blue-500/25"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteEvent(event)}
                          className="rounded-lg bg-red-500/15 px-3 py-2 text-sm font-bold text-red-300 hover:bg-red-500/25"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}