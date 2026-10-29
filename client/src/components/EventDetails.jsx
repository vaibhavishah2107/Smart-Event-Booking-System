
import { useEffect, useMemo, useState } from "react";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85";

function formatDate(date) {
  if (!date) return "Date to be announced";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function EventDetails({ event: initialEvent, onBack, onBookEvent }) {
  const [event, setEvent] = useState(initialEvent || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [ticketCategory, setTicketCategory] = useState("Standard");

  useEffect(() => {
    if (!initialEvent?.id) return;

    setEvent(initialEvent);
    setQuantity(1);
    setTicketCategory("Standard");
    setError("");

    let cancelled = false;

    async function fetchLatestEvent() {
      setLoading(true);

      try {
        const response = await fetch(
          `${API_URL}/api/events/${initialEvent.id}`
        );

        if (!response.ok) {
          throw new Error("Unable to load the latest event details.");
        }

        const data = await response.json();

        if (!cancelled) setEvent(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchLatestEvent();

    return () => {
      cancelled = true;
    };
  }, [initialEvent?.id]);

  const ticketOptions = useMemo(() => {
    const basePrice = Number(event?.price ?? 0);

    return [
      {
        name: "Standard",
        description: "General admission",
        price: basePrice,
        label: "Standard access",
      },
      {
        name: "Premium",
        description: "Premium ticket option",
        price: Math.round(basePrice * 1.5 * 100) / 100,
        label: "Premium access",
      },
      {
        name: "VIP",
        description: "VIP ticket option",
        price: Math.round(basePrice * 2 * 100) / 100,
        label: "VIP access",
      },
    ];
  }, [event?.price]);

  if (!event) {
    return (
      <section className="min-h-screen bg-slate-50 px-5 py-20">
        <div className="mx-auto max-w-3xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-black">Select an event first</h2>

          <button
            onClick={onBack}
            className="mt-5 rounded-full bg-blue-700 px-5 py-3 font-bold text-white"
          >
            Back to events
          </button>
        </div>
      </section>
    );
  }

  const availableSeats = Number(event.available_seats ?? 0);
  const selectedTicket = ticketOptions.find(
    (ticket) => ticket.name === ticketCategory
  );

  const unitPrice = selectedTicket?.price ?? 0;
  const totalPrice = unitPrice * quantity;
  const soldOut = availableSeats <= 0;

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    event.location || ""
  )}`;

  function continueToBooking() {
    if (soldOut) return;

    if (quantity > availableSeats) {
      setError(`Only ${availableSeats} tickets are currently available.`);
      return;
    }

    setError("");

    onBookEvent?.({
      ...event,
      quantity,
      ticket_category: ticketCategory,
      selected_unit_price: unitPrice,
      selected_total: totalPrice,
    });
  }

  return (
    <section className="min-h-screen bg-slate-50 px-5 py-10 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-7xl">
        <button
          onClick={onBack}
          className="mb-7 inline-flex items-center gap-2 text-sm font-bold text-slate-600 transition hover:text-blue-700"
        >
          <span aria-hidden="true">←</span> Back to events
        </button>

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          >
            {error}
          </div>
        )}

        {loading && (
          <p className="mb-4 text-sm text-slate-500">
            Refreshing event information...
          </p>
        )}

        <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_.9fr]">
          {/* EVENT INFORMATION */}
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="relative h-72 overflow-hidden bg-slate-200 sm:h-[430px]">
              <img
                src={event.img || FALLBACK_IMAGE}
                alt={event.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = FALLBACK_IMAGE;
                }}
                className="h-full w-full object-cover"
              />

              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

              <div className="absolute bottom-6 left-6 right-6 sm:bottom-8 sm:left-8">
                <span className="inline-flex rounded-full bg-white/95 px-3 py-2 text-xs font-extrabold text-blue-800">
                  EVENT EXPERIENCE
                </span>

                <h1 className="mt-4 text-3xl font-black leading-tight text-white sm:text-5xl">
                  {event.title}
                </h1>
              </div>
            </div>

            <div className="p-6 sm:p-8">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    Date and time
                  </p>
                  <p className="mt-2 font-bold text-slate-900">
                    {formatDate(event.date)}
                  </p>
                </div>

                <div className="rounded-2xl bg-blue-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                    Venue
                  </p>
                  <p className="mt-2 font-bold text-slate-900">
                    {event.location}
                  </p>
                </div>
              </div>

              <h2 className="mt-8 text-xl font-extrabold text-slate-950">
                About this event
              </h2>

              <p className="mt-3 whitespace-pre-line leading-8 text-slate-600">
                {event.description ||
                  "Discover this experience and join us for an exciting event."}
              </p>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="text-sm text-slate-500">
                    Current availability
                  </p>
                  <p
                    className={`mt-1 font-extrabold ${
                      soldOut ? "text-red-600" : "text-emerald-700"
                    }`}
                  >
                    {soldOut
                      ? "Sold out"
                      : `${availableSeats} seats available`}
                  </p>
                </div>

                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-blue-400 hover:text-blue-700"
                >
                  View on Google Maps ↗
                </a>
              </div>
            </div>
          </div>

          {/* TICKET SELECTOR */}
          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">
              Your experience
            </p>

            <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
              Choose your tickets
            </h2>

            <p className="mt-3 text-sm leading-6 text-slate-500">
              Select a ticket category and the number of tickets you need.
            </p>

            <div className="mt-7 space-y-3">
              {ticketOptions.map((ticket) => (
                <button
                  key={ticket.name}
                  type="button"
                  onClick={() => setTicketCategory(ticket.name)}
                  disabled={soldOut}
                  className={`w-full rounded-2xl border p-4 text-left transition duration-200 ${
                    ticketCategory === ticket.name
                      ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                      : "border-slate-200 hover:border-blue-300"
                  } disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className={`flex h-5 w-5 items-center justify-center rounded-full border ${
                          ticketCategory === ticket.name
                            ? "border-blue-700"
                            : "border-slate-300"
                        }`}
                      >
                        {ticketCategory === ticket.name && (
                          <span className="h-2.5 w-2.5 rounded-full bg-blue-700" />
                        )}
                      </span>

                      <div>
                        <p className="font-extrabold text-slate-950">
                          {ticket.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {ticket.description}
                        </p>
                      </div>
                    </div>

                    <p className="text-lg font-black text-slate-950">
                      {ticket.price === 0
                        ? "Free"
                        : `₹${ticket.price.toLocaleString("en-IN")}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-7">
              <label
                htmlFor="ticket-quantity"
                className="mb-2 block text-sm font-bold text-slate-700"
              >
                Number of tickets
              </label>

              <select
                id="ticket-quantity"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                disabled={soldOut}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
              >
                {Array.from(
                  { length: Math.min(10, availableSeats) },
                  (_, index) => index + 1
                ).map((number) => (
                  <option key={number} value={number}>
                    {number} {number === 1 ? "ticket" : "tickets"}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
              <div className="flex justify-between text-sm text-slate-500">
                <span>
                  {ticketCategory} × {quantity}
                </span>
                <span>
                  ₹{totalPrice.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">
                  Total amount
                </span>
                <span className="text-2xl font-black text-blue-700">
                  {totalPrice === 0
                    ? "Free"
                    : `₹${totalPrice.toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={soldOut || loading}
              onClick={continueToBooking}
              className="mt-6 w-full rounded-full bg-blue-700 px-5 py-4 font-extrabold text-white shadow-lg shadow-blue-700/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {soldOut ? "Sold out" : "Continue to checkout ↗"}
            </button>

            <p className="mt-4 text-center text-xs leading-5 text-slate-400">
              Seat availability is checked again when your booking is
              submitted.
            </p>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default EventDetails;
