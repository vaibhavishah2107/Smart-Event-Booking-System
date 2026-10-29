import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import AdminDashboard from "./AdminDashboard";
gsap.registerPlugin(ScrollTrigger);

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

const CATEGORIES = [
  "All Events",
  "Technology",
  "Music",
  "Business",
  "Lifestyle",
];

const IMAGES = {
  Technology:
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=85",
  Music:
    "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&w=1200&q=85",
  Business:
    "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=85",
  Lifestyle:
    "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=1200&q=85",
};

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=85";
  
const HERO_DECK_IMAGES = [
  {
    src: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=1200&q=90",
    alt: "Live concert with vibrant stage lighting",
  },
  {
    src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1200&q=90",
    alt: "Technology conference and live presentation",
  },
  {
    src: "https://images.unsplash.com/photo-1506157786151-b8491531f063?auto=format&fit=crop&w=1200&q=90",
    alt: "Energetic live music festival",
  },
  {
    src: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=90",
    alt: "Colorful event with dramatic lights",
  },
];


function getCategory(event) {
  const text = `${event?.title || ""} ${event?.description || ""}`.toLowerCase();

  if (/music|concert|dj|singing|festival|dance/.test(text)) {
    return "Music";
  }

  if (/business|startup|entrepreneur|networking|marketing/.test(text)) {
    return "Business";
  }

  if (/yoga|food|art|fashion|wellness|lifestyle|photography/.test(text)) {
    return "Lifestyle";
  }

  return "Technology";
}

function getImage(event) {
  return (
    event?.img ||
    event?.image ||
    event?.image_url ||
    IMAGES[getCategory(event)] ||
    FALLBACK_IMAGE
  );
}

function formatDate(value, includeTime = false) {
  if (!value) return "Date to be announced";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString(
    "en-IN",
    includeTime
      ? {
          weekday: "short",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
        }
      : {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
  );
}

function formatPrice(value) {
  const amount = Number(value);

  if (
    value === null ||
    value === undefined ||
    value === "" ||
    !Number.isFinite(amount)
  ) {
    return "Price unavailable";
  }

  return amount === 0 ? "Free" : `₹${amount.toLocaleString("en-IN")}`;
}

function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`rounded-full px-5 py-3 font-bold transition duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 ${className}`}
    >
      {children}
    </button>
  );
}

export default function App() {
  const rootRef = useRef(null);
  const qrRef = useRef(null);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All Events");

  const [page, setPage] = useState("home");
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [quantity, setQuantity] = useState(1);
  const [ticketCategory, setTicketCategory] = useState("Standard");

  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingResult, setBookingResult] = useState(null);
  
const [heroDeckIndex, setHeroDeckIndex] = useState(0);

useEffect(() => {
  const timer = window.setInterval(() => {
    setHeroDeckIndex((current) => (
      current + 1
    ) % HERO_DECK_IMAGES.length);
  }, 1000);

  return () => window.clearInterval(timer);
}, []);


  // Load events from the backend.
  useEffect(() => {
    const controller = new AbortController();

    async function loadEvents() {
      try {
        setLoading(true);
        setLoadError("");

        const response = await fetch(`${API_URL}/api/events`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Server returned ${response.status}`);
        }

        const data = await response.json();

        setEvents(
          Array.isArray(data)
            ? data
            : Array.isArray(data.events)
              ? data.events
              : []
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setLoadError(
            "Unable to load events. Check your backend and MySQL connection."
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadEvents();

    return () => controller.abort();
  }, []);

  // Search and filter events.
  const filteredEvents = useMemo(() => {
    const term = search.trim().toLowerCase();

    return events.filter((event) => {
      const searchable = [
        event.title,
        event.description,
        event.location,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !term || searchable.includes(term);
      const matchesCategory =
        category === "All Events" || getCategory(event) === category;

      return matchesSearch && matchesCategory;
    });
  }, [events, search, category]);

  const ticketOptions = useMemo(() => {
    const basePrice = Number(selectedEvent?.price ?? 0);

    return [
      {
        name: "Standard",
        description: "General admission",
        price: basePrice,
      },
      {
        name: "Premium",
        description: "Premium experience",
        price: Math.round(basePrice * 1.5 * 100) / 100,
      },
      {
        name: "VIP",
        description: "VIP experience",
        price: Math.round(basePrice * 2 * 100) / 100,
      },
    ];
  }, [selectedEvent]);

  const chosenTicket =
    ticketOptions.find((ticket) => ticket.name === ticketCategory) ||
    ticketOptions[0];

  const total = chosenTicket.price * quantity;

  const availableSeats =
    selectedEvent?.available_seats == null
      ? null
      : Number(selectedEvent.available_seats);

  const qrValue = JSON.stringify({
    booking_id:
      bookingResult?.booking_id ?? bookingResult?.id ?? "CONFIRMED",
    event_id: selectedEvent?.id,
    event: selectedEvent?.title,
    attendee: form.name,
    email: form.email,
    quantity,
  });

  // GSAP entrance and scroll animations.
  useEffect(() => {
    if (
      !rootRef.current ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        ".site-nav",
        { y: -25, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: "power3.out" }
      );

      gsap.fromTo(
        ".hero-copy > *",
        { y: 25, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.7,
          stagger: 0.1,
          delay: 0.1,
          ease: "power3.out",
        }
      );

      gsap.fromTo(
        ".hero-visual",
        { x: 30, opacity: 0, scale: 0.96 },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          duration: 0.9,
          delay: 0.2,
          ease: "power3.out",
        }
      );

      gsap.to(".hero-visual", {
        y: -8,
        duration: 3,
        ease: "sine.inOut",
        repeat: -1,
        yoyo: true,
      });

      gsap.utils.toArray(".motion-reveal").forEach((element) => {
        gsap.fromTo(
          element,
          { y: 25, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.7,
            ease: "power3.out",
            scrollTrigger: {
              trigger: element,
              start: "top 90%",
              once: true,
            },
          }
        );
      });

      gsap.utils.toArray(".event-card").forEach((element, index) => {
        gsap.fromTo(
          element,
          { y: 25, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 0.6,
            delay: (index % 3) * 0.08,
            scrollTrigger: {
              trigger: element,
              start: "top 92%",
              once: true,
            },
          }
        );
      });

      gsap.to(".ticker-track", {
        xPercent: -50,
        duration: 25,
        ease: "none",
        repeat: -1,
      });
    }, rootRef);

    return () => context.revert();
  }, [loading, filteredEvents.length, page]);

  // Celebration after a successful booking.
  useEffect(() => {
    if (
      page !== "success" ||
      !bookingResult ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, [page, bookingResult]);

  function scrollToEvents() {
    setPage("home");

    window.setTimeout(() => {
      document
        .getElementById("events")
        ?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }

  function openEvent(event) {
    setSelectedEvent(event);
    setQuantity(1);
    setTicketCategory("Standard");
    setError("");
    setBookingResult(null);
    setPage("details");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function beginCheckout() {
    if (!selectedEvent) return;

    if (
      availableSeats !== null &&
      availableSeats >= 0 &&
      quantity > availableSeats
    ) {
      setError(`Only ${availableSeats} tickets are available.`);
      return;
    }

    setForm({ name: "", email: "", mobile: "" });
    setError("");
    setPage("checkout");

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Send the booking to the backend.
  async function submitBooking(event) {
    event.preventDefault();
    setError("");

    if (!selectedEvent?.id) {
      setError("This event does not have a valid ID.");
      return;
    }

    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) {
      setError("Choose between 1 and 10 tickets.");
      return;
    }

    if (
      availableSeats !== null &&
      availableSeats >= 0 &&
      quantity > availableSeats
    ) {
      setError("There are not enough seats available.");
      return;
    }

    setSubmitting(true);

    try {
      console.log("Booking function called:", selectedEvent.id);
      console.log("Sending booking request to:", `${API_URL}/api/bookings`);
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: selectedEvent.id,
          name: form.name.trim(),
          email: form.email.trim(),
          mobile: form.mobile.trim(),
          quantity,
          ticket_category: ticketCategory,
        }),
      });
      console.log("Booking response status:", response.status);

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Booking failed. Check your backend POST /api/bookings route."
        );
      }

      setBookingResult(data);
      setPage("success");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the backend. Check that your server is running."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // Download a printable HTML ticket.
  function downloadTicket() {
    if (!bookingResult || !selectedEvent || !qrRef.current) return;

    const svg = qrRef.current.querySelector("svg");

    if (!svg) {
      setError("The QR code is not ready yet.");
      return;
    }

    const qrMarkup = new XMLSerializer().serializeToString(svg);

    const safe = (value) =>
      String(value ?? "").replace(/[&<>"']/g, (character) => {
        const entities = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };

        return entities[character];
      });

    const ticketId =
      bookingResult.booking_id ?? bookingResult.id ?? "Confirmed";

    const ticketHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Infosystem Event Ticket</title>
<style>
body{font-family:Arial,sans-serif;background:#f1f5f9;padding:24px;color:#0f172a}
.ticket{max-width:620px;margin:20px auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px #0f172a18}
.head{background:#1d4ed8;color:white;padding:28px}
.body{padding:28px}
.row{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid #e2e8f0}
.label{color:#64748b}.value{font-weight:bold;text-align:right;overflow-wrap:anywhere}
.qr{text-align:center;margin:24px auto}.qr svg{width:190px;height:190px}
@media print{body{background:white;padding:0}.ticket{box-shadow:none}}
</style>
</head>
<body>
<div class="ticket">
<div class="head">
<p>INFOSYSTEM EVENT MANAGEMENT</p>
<h1>${safe(selectedEvent.title)}</h1>
<p>Booking confirmation</p>
</div>
<div class="body">
<div class="row"><span class="label">Booking ID</span><span class="value">${safe(ticketId)}</span></div>
<div class="row"><span class="label">Attendee</span><span class="value">${safe(form.name)}</span></div>
<div class="row"><span class="label">Email</span><span class="value">${safe(form.email)}</span></div>
<div class="row"><span class="label">Event date</span><span class="value">${safe(formatDate(selectedEvent.date, true))}</span></div>
<div class="row"><span class="label">Location</span><span class="value">${safe(selectedEvent.location || "To be announced")}</span></div>
<div class="row"><span class="label">Ticket type</span><span class="value">${safe(ticketCategory)}</span></div>
<div class="row"><span class="label">Quantity</span><span class="value">${quantity}</span></div>
<div class="row"><span class="label">Total</span><span class="value">${safe(formatPrice(bookingResult.total_amount ?? total))}</span></div>
<div class="qr">${qrMarkup}<p>Scan for booking reference</p></div>
<p>Keep this ticket for reference. Event staff should verify the booking against the database.</p>
</div>
</div>
<script>window.onload=()=>window.print()</script>
</body>
</html>`;

    const blob = new Blob([ticketHtml], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = `event-ticket-${ticketId}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div ref={rootRef} className="min-h-screen bg-white text-slate-900">
      {/* Navigation */}
      <header className="site-nav sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <button
            onClick={() => {
              setPage("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-700 text-lg font-black text-white">
              IE
            </span>
            <span>
              <span className="block text-lg font-black tracking-tight">
                Infosystem
              </span>
              <span className="block text-[10px] font-bold tracking-[0.2em] text-blue-700">
                EVENT MANAGEMENT
              </span>
            </span>
          </button>

          <div className="hidden items-center gap-8 md:flex">
            <button
              onClick={() => {
                setPage("home");
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Home
            </button>
            <button
              onClick={scrollToEvents}
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              Explore events
            </button>
            <button
  onClick={() => {
    setPage("admin");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }}
  className="text-sm font-semibold text-slate-600 transition hover:text-blue-700"
>
  Admin
</button>
            <a
              href="#about"
              className="text-sm font-semibold text-slate-600 hover:text-blue-700"
            >
              About
            </a>
          </div>

          <Button
            onClick={scrollToEvents}
            className="bg-blue-700 text-sm text-white hover:bg-blue-800"
          >
            Book a ticket ↗
          </Button>
        </nav>
      </header>
            {/* Admin Dashboard */}
      {page === "admin" && (
        <AdminDashboard
          onBack={() => {
            setPage("home");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {/* Homepage */}
      {page === "home" && (
        <>
          <main>
            <section className="relative overflow-hidden bg-[#07152e] text-white">
              <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-blue-500/25 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-32 left-1/4 h-80 w-80 rounded-full bg-indigo-500/20 blur-3xl" />

              <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-2 lg:py-32">
                <div className="hero-copy relative z-10">
                  <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold tracking-wider text-blue-200">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    YOUR NEXT EXPERIENCE STARTS HERE
                  </div>

                  
<h1 className="max-w-2xl text-5xl font-black leading-[1.06] tracking-tight sm:text-6xl lg:text-7xl">
  Find your
  <span className="hero-color-people block">
    people.
  </span>
  Find your
  <span className="hero-color-event block">
    next event.
  </span>
</h1>


                  <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                    Discover inspiring experiences, connect with people who
                    share your interests, and reserve your place at events
                    worth remembering.
                  </p>

                  <div className="mt-9 flex flex-wrap gap-4">
                    <Button
                      onClick={scrollToEvents}
                      className="bg-blue-600 px-7 py-4 text-white hover:bg-blue-500"
                    >
                      Explore events ↗
                    </Button>

                    <a
                      href="#about"
                      className="inline-flex items-center rounded-full border border-white/20 px-7 py-4 font-bold transition hover:bg-white/10"
                    >
                      Discover more
                    </a>
                  </div>

                  <div className="mt-12 flex flex-wrap gap-8 border-t border-white/15 pt-7">
                    <div>
                      <p className="text-3xl font-black">
                        {events.length}+
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Events to explore
                      </p>
                    </div>
                    <div>
                      <p className="text-3xl font-black">3</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Ticket categories
                      </p>
                    </div>
                    <div>
                      <p className="text-3xl font-black">1</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Easy booking journey
                      </p>
                    </div>
                  </div>
                </div>

                

<div className="hero-visual relative">
  <div className="absolute -inset-5 rounded-[2.5rem] bg-gradient-to-r from-blue-500/40 via-indigo-500/30 to-purple-500/40 blur-3xl" />

  <div className="hero-deck relative mx-auto h-[380px] w-full max-w-[560px] sm:h-[500px]">
    {[0, 1, 2].map((position) => {
      const imageIndex =
        (heroDeckIndex + position) % HERO_DECK_IMAGES.length;
      const photo = HERO_DECK_IMAGES[imageIndex];

      return (
        <div
          key={`${heroDeckIndex}-${position}`}
          className={`hero-deck-card hero-deck-card-${position}`}
        >
          <img
            src={photo.src}
            alt={photo.alt}
            className="h-full w-full rounded-[1.5rem] object-cover"
          />
          <div className="pointer-events-none absolute inset-0 rounded-[1.5rem] bg-gradient-to-t from-[#07152e]/40 via-transparent to-white/5" />
        </div>
      );
    })}

    <div className="pointer-events-none absolute inset-x-4 bottom-4 z-20 rounded-2xl border border-white/20 bg-[#07152e]/90 p-4 text-white shadow-2xl backdrop-blur-xl sm:inset-x-6 sm:bottom-6 sm:p-5">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-300">
        YOUR NEXT EXPERIENCE
      </p>
      <p className="mt-2 text-xl font-black sm:text-2xl">
        Moments worth showing up for.
      </p>
      <button
        onClick={scrollToEvents}
        className="pointer-events-auto mt-3 text-sm font-bold text-blue-300 transition hover:text-white"
      >
        Find your event →
      </button>
    </div>
  </div>
</div>


              </div>
            </section>

            {/* Scrolling ticker */}
            <div className="overflow-hidden border-b border-slate-200 bg-white py-5">
              <div className="ticker-track flex w-max gap-10 whitespace-nowrap text-sm font-black uppercase tracking-[0.2em] text-slate-400">
                {[0, 1, 2, 3].map((item) => (
                  <span key={item} className="flex items-center gap-10">
                    DISCOVER SOMETHING NEW
                    <span className="text-blue-600">✳</span>
                    MEET YOUR COMMUNITY
                    <span className="text-blue-600">✳</span>
                    MAKE IT MEMORABLE
                    <span className="text-blue-600">✳</span>
                  </span>
                ))}
              </div>
            </div>
            

            {/* Events */}
            

<section
  id="events"
  className="events-premium relative scroll-mt-24 overflow-hidden px-5 py-20 sm:px-8 sm:py-28"
>



              <div className="mx-auto max-w-7xl">
                <div className="motion-reveal flex flex-col justify-between gap-6 md:flex-row md:items-end">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                      Curated for you
                    </p>
                    <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
                      Explore events
                    </h2>
                    <p className="mt-4 max-w-xl leading-7 text-slate-500">
                      From technology and business to music and lifestyle,
                      find an experience that matches your interests.
                    </p>
                  </div>

                  <div className="w-full md:max-w-sm">
                    <label htmlFor="event-search" className="sr-only">
                      Search events
                    </label>
                    <input
                      id="event-search"
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search events, places..."
                      className="w-full rounded-full border border-slate-200 bg-white px-5 py-4 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>
                </div>

                <div className="mt-9 flex gap-2 overflow-x-auto pb-3">
                  {CATEGORIES.map((item) => (
                    <button
                      key={item}
                      onClick={() => setCategory(item)}
                      className={`shrink-0 rounded-full px-5 py-3 text-sm font-bold transition ${
                        category === item
                          ? "bg-blue-700 text-white"
                          : "border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:text-blue-700"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                {loading && (
                  <div className="grid gap-6 pt-8 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3].map((item) => (
                      <div
                        key={item}
                        className="h-96 animate-pulse rounded-3xl bg-slate-100"
                      />
                    ))}
                  </div>
                )}

                {!loading && loadError && (
                  <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
                    <p className="font-bold text-red-700">{loadError}</p>
                    <p className="mt-2 text-sm leading-6 text-red-600">
                      Start your backend and check that GET /api/events
                      returns event data.
                    </p>
                    <Button
                      onClick={() => window.location.reload()}
                      className="mt-4 bg-red-700 text-white"
                    >
                      Try again
                    </Button>
                  </div>
                )}

                {!loading && !loadError && filteredEvents.length === 0 && (
                  <div className="mt-8 rounded-3xl border border-dashed border-slate-300 p-12 text-center">
                    <p className="text-xl font-black">No events found</p>
                    <p className="mt-2 text-slate-500">
                      Try another search or category.
                    </p>
                    <Button
                      onClick={() => {
                        setSearch("");
                        setCategory("All Events");
                      }}
                      className="mt-5 bg-blue-700 text-white"
                    >
                      Clear filters
                    </Button>
                  </div>
                )}

                {!loading && !loadError && filteredEvents.length > 0 && (
                  <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredEvents.map((event) => (
                      <article
                        key={event.id}
                        className="event-card group overflow-hidden rounded-3xl border border-slate-200 bg-white transition duration-300 hover:-translate-y-2 hover:border-blue-200 hover:shadow-2xl hover:shadow-blue-950/10"
                      >
                        <div className="relative h-56 overflow-hidden">
                          <img
                            src={getImage(event)}
                            alt={event.title}
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                          />

                          <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-2 text-xs font-black text-blue-800">
                            {getCategory(event)}
                          </span>

                          <span className="absolute bottom-4 right-4 rounded-full bg-[#07152e]/90 px-4 py-2 text-sm font-black text-white">
                            {formatPrice(event.price)}
                          </span>
                        </div>

                        <div className="p-6">
                          <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                            {formatDate(event.date)}
                          </p>

                          <h3 className="mt-3 line-clamp-2 text-2xl font-black tracking-tight">
                            {event.title}
                          </h3>

                          <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">
                            {event.description ||
                              "Discover this experience and reserve your place."}
                          </p>

                          <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-5">
                            <p className="line-clamp-1 text-sm font-semibold text-slate-500">
                              <span className="mr-1 text-blue-600">⌖</span>
                              {event.location || "Location to be announced"}
                            </p>
                          </div>

                          <Button
                            onClick={() => openEvent(event)}
                            className="mt-5 w-full bg-blue-700 text-white hover:bg-blue-800"
                          >
                            View event details ↗
                          </Button>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* About */}
            <section id="about" className="bg-slate-50 px-5 py-20 sm:px-8 sm:py-24">
              <div className="motion-reveal mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-700">
                    Made for memorable moments
                  </p>
                  <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
                    Your next great experience is closer than you think.
                  </h2>
                  <p className="mt-5 leading-8 text-slate-500">
                    Infosystem Event Management helps you discover events,
                    compare ticket options, and book your place through a
                    simple, convenient experience.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {[
                    ["01", "Discover", "Find events that match your interests."],
                    ["02", "Choose", "Select a ticket category and quantity."],
                    ["03", "Reserve", "Submit your details through checkout."],
                    ["04", "Celebrate", "Get a booking reference and QR ticket."],
                  ].map(([number, title, description]) => (
                    <div
                      key={number}
                      className="rounded-3xl border border-slate-200 bg-white p-6"
                    >
                      <p className="text-sm font-black text-blue-700">
                        {number}
                      </p>
                      <h3 className="mt-4 text-xl font-black">{title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </main>
        </>
      )}

      {/* Event details */}
      {page === "details" && selectedEvent && (
        <main className="min-h-[80vh] bg-slate-50 px-5 py-12 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-7xl">
            <button
              onClick={() => setPage("home")}
              className="mb-7 font-bold text-slate-600 hover:text-blue-700"
            >
              ← Back to events
            </button>

            <div className="grid items-start gap-8 lg:grid-cols-[1.2fr_.8fr]">
              <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                
<div className="event-photo-motion overflow-hidden rounded-t-3xl">
  <img
    src={getImage(selectedEvent)}
    alt={selectedEvent.title}
    className="h-72 w-full object-cover sm:h-96"
  />
</div>

                <div className="p-6 sm:p-9">
                  <span className="rounded-full bg-blue-50 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-700">
                    {getCategory(selectedEvent)}
                  </span>

                  <h1 className="mt-5 text-4xl font-black tracking-tight sm:text-5xl">
                    {selectedEvent.title}
                  </h1>

                  <p className="mt-5 leading-8 text-slate-500">
                    {selectedEvent.description ||
                      "Join us for this exciting event and create memorable experiences."}
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Date and time</p>
                      <p className="mt-2 font-bold">
                        {formatDate(selectedEvent.date, true)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Location</p>
                      <p className="mt-2 font-bold">
                        {selectedEvent.location || "To be announced"}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">Ticket price</p>
                      <p className="mt-2 text-2xl font-black text-blue-700">
                        {formatPrice(selectedEvent.price)}
                      </p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-5">
                      <p className="text-sm text-slate-500">
                        Ticket availability
                      </p>
                      <p className="mt-2 font-bold">
                        {availableSeats === null
                          ? "Check availability at booking"
                          : availableSeats <= 0
                            ? "Sold out"
                            : `${availableSeats} seats available`}
                      </p>
                    </div>
                  </div>

                  {selectedEvent.location && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.location)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-6 inline-block font-bold text-blue-700 hover:text-blue-900"
                    >
                      View location on Google Maps ↗
                    </a>
                  )}
                </div>
              </div>

              <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  Your experience
                </p>

                <h2 className="mt-3 text-3xl font-black">
                  Choose your tickets
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-500">
                  Choose the ticket option that works best for you.
                </p>

                <div className="mt-7 space-y-3">
                  {ticketOptions.map((ticket) => (
                    <button
                      key={ticket.name}
                      type="button"
                      onClick={() => setTicketCategory(ticket.name)}
                      className={`w-full rounded-2xl border p-4 text-left transition ${
                        ticketCategory === ticket.name
                          ? "border-blue-600 bg-blue-50 ring-2 ring-blue-100"
                          : "border-slate-200 hover:border-blue-300"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-extrabold">{ticket.name}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {ticket.description}
                          </p>
                        </div>

                        <p className="text-lg font-black">
                          {formatPrice(ticket.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>

                <label
                  htmlFor="ticket-quantity"
                  className="mb-2 mt-7 block text-sm font-bold text-slate-700"
                >
                  Number of tickets
                </label>

                <select
                  id="ticket-quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                >
                  {Array.from(
                    {
                      length: Math.max(
                        1,
                        Math.min(10, availableSeats ?? 10)
                      ),
                    },
                    (_, index) => index + 1
                  ).map((number) => (
                    <option key={number} value={number}>
                      {number} {number === 1 ? "ticket" : "tickets"}
                    </option>
                  ))}
                </select>

                <div className="mt-6 space-y-3 border-t border-slate-200 pt-5">
                  <div className="flex justify-between text-sm text-slate-500">
                    <span>
                      {ticketCategory} × {quantity}
                    </span>
                    <span>{formatPrice(total)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-bold">Total amount</span>
                    <span className="text-2xl font-black text-blue-700">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>

                {error && (
                  <p
                    role="alert"
                    className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}

                <Button
                  disabled={availableSeats !== null && availableSeats <= 0}
                  onClick={beginCheckout}
                  className="mt-6 w-full bg-blue-700 py-4 text-white hover:bg-blue-800"
                >
                  {availableSeats !== null && availableSeats <= 0
                    ? "Sold out"
                    : "Continue to checkout ↗"}
                </Button>

                <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                  This demo does not process online payments.
                </p>
              </aside>
            </div>
          </div>
        </main>
      )}

      {/* Checkout */}
      {page === "checkout" && selectedEvent && (
        <main className="min-h-[80vh] bg-slate-50 px-5 py-12 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <button
              onClick={() => {
                setPage("details");
                setError("");
              }}
              className="mb-7 font-bold text-slate-600 hover:text-blue-700"
            >
              ← Back to event details
            </button>

            <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_.9fr]">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">
                  Almost there
                </p>

                <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                  Complete your booking
                </h1>

                <p className="mt-3 leading-7 text-slate-500">
                  Enter your details to reserve your tickets.
                </p>

                <form onSubmit={submitBooking} className="mt-8 space-y-5">
                  <div>
                    <label
                      htmlFor="checkout-name"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Full name
                    </label>
                    <input
                      id="checkout-name"
                      required
                      maxLength={255}
                      autoComplete="name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({ ...form, name: e.target.value })
                      }
                      placeholder="Enter your full name"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-email"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Email address
                    </label>
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      maxLength={255}
                      autoComplete="email"
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      placeholder="you@example.com"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-mobile"
                      className="mb-2 block text-sm font-bold text-slate-700"
                    >
                      Mobile number
                    </label>
                    <input
                      id="checkout-mobile"
                      type="tel"
                      required
                      pattern="[0-9+() -]{8,20}"
                      maxLength={20}
                      autoComplete="tel"
                      value={form.mobile}
                      onChange={(e) =>
                        setForm({ ...form, mobile: e.target.value })
                      }
                      placeholder="Enter your mobile number"
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                    />
                  </div>

                  {error && (
                    <p
                      role="alert"
                      className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                    >
                      {error}
                    </p>
                  )}

                  <Button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-700 py-4 text-white hover:bg-blue-800"
                  >
                    {submitting
                      ? "Confirming your booking..."
                      : "Confirm booking ↗"}
                  </Button>

                  <p className="text-center text-xs leading-5 text-slate-400">
                    Your booking must be saved successfully by the backend
                    before confirmation is displayed.
                  </p>
                </form>
              </div>

              <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                <img
                  src={getImage(selectedEvent)}
                  alt={selectedEvent.title}
                  className="h-48 w-full object-cover"
                />

                <div className="p-6 sm:p-8">
                  <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                    Order summary
                  </p>

                  <h2 className="mt-3 text-2xl font-black">
                    {selectedEvent.title}
                  </h2>

                  <p className="mt-3 text-sm leading-6 text-slate-500">
                    {formatDate(selectedEvent.date, true)}
                  </p>

                  <p className="mt-1 text-sm text-slate-500">
                    {selectedEvent.location || "Location to be announced"}
                  </p>

                  <div className="my-6 border-t border-dashed border-slate-300" />

                  <div className="flex justify-between gap-4 text-sm">
                    <span className="text-slate-500">
                      {ticketCategory} × {quantity}
                    </span>
                    <span className="font-bold">{formatPrice(total)}</span>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                    <span className="font-bold">Total</span>
                    <span className="text-3xl font-black text-blue-700">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        </main>
      )}

      {/* Successful booking */}
      {page === "success" && selectedEvent && bookingResult && (
        <main className="min-h-[80vh] bg-slate-50 px-5 py-12 sm:px-8 sm:py-20">
          <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-blue-950/5">
            <div className="bg-gradient-to-br from-blue-800 to-indigo-700 px-6 py-12 text-center text-white sm:px-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-4xl">
                ✓
              </div>

              <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-blue-200">
                You're on the list
              </p>

              <h1 className="mt-3 text-3xl font-black sm:text-4xl">
                Booking confirmed!
              </h1>

              <p className="mx-auto mt-3 max-w-md leading-7 text-blue-100">
                Your booking was successfully recorded. Your ticket details
                are below.
              </p>
            </div>

            <div className="p-6 sm:p-10">
              <div className="rounded-2xl border border-slate-200 p-5 sm:p-7">
                <p className="text-xs font-black uppercase tracking-wider text-blue-700">
                  Your event
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  {selectedEvent.title}
                </h2>

                <p className="mt-3 text-sm text-slate-500">
                  {formatDate(selectedEvent.date, true)} ·{" "}
                  {selectedEvent.location || "Location to be announced"}
                </p>

                <div className="my-6 border-t border-dashed border-slate-300" />

                <div className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Booking ID</p>
                    <p className="mt-1 break-words font-bold">
                      #{bookingResult.booking_id ?? bookingResult.id ?? "Confirmed"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Attendee</p>
                    <p className="mt-1 break-words font-bold">{form.name}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Total amount</p>
                    <p className="mt-1 font-black">
                      {formatPrice(bookingResult.total_amount ?? total)}
                    </p>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-center">
                  <p className="font-extrabold">Your booking QR code</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Keep this code with your ticket.
                  </p>

                  <div
                    ref={qrRef}
                    className="mx-auto mt-5 flex justify-center"
                  >
                    <QRCodeSVG
                      value={qrValue}
                      size={190}
                      level="H"
                      includeMargin
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Reference: #
                    {bookingResult.booking_id ?? bookingResult.id ?? "Confirmed"}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button
                  onClick={downloadTicket}
                  className="flex-1 bg-blue-700 py-4 text-white hover:bg-blue-800"
                >
                  Download ticket ↗
                </Button>

                <Button
                  onClick={scrollToEvents}
                  className="flex-1 border border-slate-200 py-4 text-slate-700 hover:bg-slate-50"
                >
                  Explore more events
                </Button>
              </div>

              <p className="mt-5 text-center text-xs leading-6 text-slate-400">
                The QR code is a booking reference. It does not prove
                payment. Event staff should verify bookings against the
                database.
              </p>
            </div>
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="bg-[#040b18] text-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-10 sm:px-8 md:flex-row md:items-center md:justify-between">
          <button
            onClick={() => {
              setPage("home");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 font-black">
              IE
            </span>

            <span>
              <span className="block font-extrabold">Infosystem</span>
              <span className="block text-xs font-semibold tracking-wider text-blue-300">
                EVENT MANAGEMENT
              </span>
            </span>
          </button>

          <p className="text-sm text-slate-400">
            Discover experiences. Make memories.
          </p>

          <p className="text-xs text-slate-500">
            © {new Date().getFullYear()} Infosystem Event Management.
          </p>
        </div>
      </footer>
    </div>
  );
}