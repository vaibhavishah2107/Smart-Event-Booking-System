
import { useEffect, useMemo, useState } from "react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80";

function formatDate(date) {
  if (!date) return "Date to be announced";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function EventListing({ onSelectEvent, onBookEvent }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [date, setDate] = useState("");

  async function loadEvents() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/events`);

      if (!response.ok) {
        throw new Error("Unable to fetch events.");
      }

      const data = await response.json();
      setEvents(Array.isArray(data) ? data : data.events || []);
    } catch (err) {
      setError(
        "Could not load events. Make sure your backend is running on port 5000."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  const locations = useMemo(() => {
    return [
      ...new Set(
        events
          .map((event) => event.location)
          .filter(Boolean)
      ),
    ];
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const searchText = search.trim().toLowerCase();

      const matchesSearch =
        !searchText ||
        `${event.title || ""} ${event.description || ""} ${
          event.location || ""
        }`
          .toLowerCase()
          .includes(searchText);

      const matchesLocation =
        !location || event.location === location;

      const matchesDate =
        !date ||
        (event.date &&
          new Date(event.date).toLocaleDateString("en-CA") === date);

      return matchesSearch && matchesLocation && matchesDate;
    });
  }, [events, search, location, date]);

  return (
    <section
      id="event-listing"
      className="min-h-screen bg-slate-50 px-5 py-16 sm:px-8 lg:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-700">
            Discover experiences
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            Find your next event<span className="text-blue-700">.</span>
          </h1>

          <p className="mt-4 max-w-2xl leading-7 text-slate-500">
            Explore events, discover new experiences, and reserve your
            tickets in just a few steps.
          </p>
        </div>

        {/* Search and filters */}
        <div className="mb-10 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-3">
          <div>
            <label
              htmlFor="event-search"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Search events
            </label>

            <input
              id="event-search"
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title or keyword"
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div>
            <label
              htmlFor="event-location"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Location
            </label>

            <select
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            >
              <option value="">All locations</option>
              {locations.map((place) => (
                <option key={place} value={place}>
                  {place}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="event-date"
              className="mb-2 block text-sm font-bold text-slate-700"
            >
              Event date
            </label>

            <input
              id="event-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </div>

          <div className="md:col-span-3">
            <button
              onClick={() => {
                setSearch("");
                setLocation("");
                setDate("");
              }}
              className="text-sm font-bold text-blue-700 transition hover:text-blue-900"
            >
              Clear all filters ↗
            </button>
          </div>
        </div>

        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            {loading
              ? "Loading events..."
              : `${filteredEvents.length} events found`}
          </p>

          <button
            onClick={loadEvents}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-bold transition hover:border-blue-400 hover:text-blue-700"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="animate-pulse overflow-hidden rounded-3xl bg-white"
              >
                <div className="h-56 bg-slate-200" />
                <div className="space-y-3 p-6">
                  <div className="h-5 w-2/3 rounded bg-slate-200" />
                  <div className="h-4 rounded bg-slate-100" />
                  <div className="h-10 rounded bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
            <p className="font-bold text-red-800">{error}</p>
            <button
              onClick={loadEvents}
              className="mt-4 rounded-full bg-red-700 px-5 py-3 font-bold text-white"
            >
              Try again
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <p className="text-2xl font-extrabold text-slate-900">
              No events found
            </p>
            <p className="mt-3 text-slate-500">
              Try a different search, location, or date.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEvents.map((event) => {
              const available = Number(event.available_seats ?? 0);
              const total = Number(event.total_seats ?? 0);
              const soldOut = available <= 0;

              return (
                <article
                  key={event.id}
                  className="event-list-card group overflow-hidden rounded-3xl border border-slate-200 bg-white transition duration-500 hover:-translate-y-2 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-950/10"
                >
                  <button
                    type="button"
                    onClick={() => onSelectEvent?.(event)}
                    className="relative block h-56 w-full overflow-hidden bg-slate-200 text-left"
                    aria-label={`View details for ${event.title}`}
                  >
                    <img
                      src={event.img || FALLBACK_IMAGE}
                      alt={event.title}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = FALLBACK_IMAGE;
                      }}
                      className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 to-transparent" />

                    <span
                      className={`absolute right-4 top-4 rounded-full px-3 py-2 text-xs font-extrabold ${
                        soldOut
                          ? "bg-red-100 text-red-700"
                          : available <= 10
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {soldOut
                        ? "Sold out"
                        : available <= 10
                          ? `Only ${available} left`
                          : "Seats available"}
                    </span>

                    <span className="absolute bottom-4 left-4 text-sm font-bold text-white">
                      {event.location}
                    </span>
                  </button>

                  <div className="p-6">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      {formatDate(event.date)}
                    </p>

                    <button
                      type="button"
                      onClick={() => onSelectEvent?.(event)}
                      className="mt-3 block text-left text-xl font-extrabold text-slate-950 transition hover:text-blue-700"
                    >
                      {event.title}
                    </button>

                    <p className="mt-3 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-slate-500">
                      {event.description || "Discover this event and book your tickets."}
                    </p>

                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                      <div>
                        <p className="text-xs text-slate-400">
                          Ticket price
                        </p>
                        <p className="mt-1 text-xl font-black text-slate-950">
                          {Number(event.price) === 0
                            ? "Free"
                            : `₹${Number(event.price).toLocaleString("en-IN")}`}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {available} of {total} seats available
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={soldOut}
                        onClick={() => onBookEvent?.(event)}
                        className="rounded-full bg-blue-700 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {soldOut ? "Sold out" : "Book now ↗"}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default EventListing;
