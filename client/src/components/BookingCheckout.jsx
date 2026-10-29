
import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";

const API_URL = (
  import.meta.env.VITE_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

function formatDate(date) {
  if (!date) return "Date to be announced";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) return date;

  return parsed.toLocaleString("en-IN", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

function BookingCheckout({ event, onBack, onComplete }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [bookingResult, setBookingResult] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const qrRef = useRef(null);

  const quantity = Math.max(1, Number(event?.quantity) || 1);

  // The current backend calculates the price using events.price.
  // Keep the displayed total consistent with that backend.
  const unitPrice = Number(event?.price ?? 0);
  const totalAmount = unitPrice * quantity;

  useEffect(() => {
    if (!bookingResult) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) return;

    const end = Date.now() + 1200;

    const timer = setInterval(() => {
      if (Date.now() > end) {
        clearInterval(timer);
        return;
      }

      confetti({
        particleCount: 5,
        spread: 65,
        origin: { y: 0.65 },
      });
    }, 120);

    confetti({
      particleCount: 100,
      spread: 90,
      startVelocity: 35,
      origin: { y: 0.6 },
    });

    return () => clearInterval(timer);
  }, [bookingResult]);

  if (!event) {
    return (
      <section className="min-h-screen bg-slate-50 px-5 py-20">
        <div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">
            No event selected
          </h2>
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

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch(`${API_URL}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          event_id: event.id,
          name: form.name.trim(),
          email: form.email.trim(),
          mobile: form.mobile.trim(),
          quantity,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Could not complete your booking."
        );
      }

      setBookingResult(data);

      if (typeof onComplete === "function") {
        onComplete(data);
      }
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to the booking server. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function downloadTicket() {
    if (!bookingResult || !qrRef.current) return;

    setDownloading(true);

    try {
      const svg = qrRef.current.querySelector("svg");

      if (!svg) {
        throw new Error("QR code is not ready yet.");
      }

      const qrMarkup = new XMLSerializer().serializeToString(svg);

      const safeTitle = String(event.title || "Event")
        .replace(/[<>]/g, "")
        .slice(0, 150);

      const ticketHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Ticket - ${safeTitle}</title>
<style>
body{font-family:Arial,sans-serif;background:#f1f5f9;padding:24px;color:#0f172a}
.ticket{max-width:620px;margin:20px auto;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px #0f172a18}
.header{background:#1d4ed8;color:#fff;padding:28px}
.content{padding:28px}
.row{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid #e2e8f0}
.label{color:#64748b;font-size:13px}
.value{font-weight:bold;text-align:right;overflow-wrap:anywhere}
.qr{text-align:center;margin:24px auto}
.qr svg{width:190px;height:190px}
.note{color:#64748b;font-size:12px;line-height:1.6}
@media print{body{background:#fff;padding:0}.ticket{box-shadow:none}}
</style>
</head>
<body>
<div class="ticket">
<div class="header">
<p>INFOSYSTEM EVENT MANAGEMENT</p>
<h1>${safeTitle}</h1>
<p>Booking confirmed</p>
</div>
<div class="content">
<div class="row"><span class="label">Booking ID</span><span class="value">${bookingResult.booking_id}</span></div>
<div class="row"><span class="label">Attendee</span><span class="value">${String(form.name).replace(/[<>]/g, "")}</span></div>
<div class="row"><span class="label">Email</span><span class="value">${String(form.email).replace(/[<>]/g, "")}</span></div>
<div class="row"><span class="label">Date</span><span class="value">${formatDate(event.date)}</span></div>
<div class="row"><span class="label">Location</span><span class="value">${String(event.location || "").replace(/[<>]/g, "")}</span></div>
<div class="row"><span class="label">Tickets</span><span class="value">${quantity}</span></div>
<div class="row"><span class="label">Total paid / payable</span><span class="value">₹${Number(bookingResult.total_amount ?? totalAmount).toLocaleString("en-IN")}</span></div>
<div class="qr">${qrMarkup}<p>Booking reference QR code</p></div>
<p class="note">Keep this ticket for your records. The QR code contains your booking reference; event staff should verify the booking against the server before granting entry.</p>
</div>
</div>
</body>
</html>`;

      const blob = new Blob([ticketHtml], {
        type: "text/html;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `event-ticket-${bookingResult.booking_id}.html`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Unable to download the ticket.");
    } finally {
      setDownloading(false);
    }
  }

  // Booking confirmation screen.
  if (bookingResult) {
    const ticketData = JSON.stringify({
      booking_id: bookingResult.booking_id,
      event_id: event.id,
      event_title: event.title,
      quantity,
      status: bookingResult.status || "confirmed",
    });

    return (
      <section className="min-h-screen bg-slate-50 px-5 py-12 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-blue-950/5">
            <div className="bg-gradient-to-br from-blue-800 to-indigo-700 px-6 py-12 text-center text-white sm:px-10">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white/15 text-4xl">
                ✓
              </div>

              <p className="mt-5 text-xs font-extrabold uppercase tracking-[0.22em] text-blue-200">
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
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      Your event
                    </p>

                    <h2 className="mt-2 text-2xl font-black text-slate-950">
                      {event.title}
                    </h2>

                    <p className="mt-3 text-sm leading-6 text-slate-500">
                      {formatDate(event.date)}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {event.location}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-blue-50 px-5 py-4 sm:min-w-36">
                    <p className="text-xs font-bold text-blue-700">
                      BOOKING ID
                    </p>

                    <p className="mt-2 text-2xl font-black text-slate-950">
                      #{bookingResult.booking_id}
                    </p>

                    <p className="mt-1 text-xs font-bold text-emerald-700">
                      {bookingResult.status || "Confirmed"}
                    </p>
                  </div>
                </div>

                <div className="my-6 border-t border-dashed border-slate-300" />

                <div className="grid gap-5 sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-slate-500">Attendee</p>
                    <p className="mt-1 break-words font-bold text-slate-900">
                      {form.name}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Tickets</p>
                    <p className="mt-1 font-bold text-slate-900">
                      {quantity}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Total amount</p>
                    <p className="mt-1 font-black text-slate-950">
                      ₹
                      {Number(
                        bookingResult.total_amount ?? totalAmount
                      ).toLocaleString("en-IN")}
                    </p>
                  </div>
                </div>

                <div className="mt-8 rounded-2xl bg-slate-50 p-5 text-center">
                  <p className="font-extrabold text-slate-900">
                    Your booking QR code
                  </p>

                  <p className="mt-2 text-sm text-slate-500">
                    Keep this code with your ticket.
                  </p>

                  <div
                    ref={qrRef}
                    className="mx-auto mt-5 flex justify-center"
                  >
                    <QRCodeSVG
                      value={ticketData}
                      size={190}
                      level="H"
                      includeMargin
                    />
                  </div>

                  <p className="mt-3 text-xs text-slate-400">
                    Reference: #{bookingResult.booking_id}
                  </p>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={downloadTicket}
                  disabled={downloading}
                  className="flex-1 rounded-full bg-blue-700 px-5 py-4 font-extrabold text-white transition hover:bg-blue-800 disabled:opacity-60"
                >
                  {downloading ? "Preparing ticket..." : "Download ticket ↗"}
                </button>

                <button
                  onClick={onBack}
                  className="flex-1 rounded-full border border-slate-200 px-5 py-4 font-extrabold text-slate-700 transition hover:bg-slate-50"
                >
                  Explore more events
                </button>
              </div>

              <p className="mt-5 text-center text-xs leading-6 text-slate-400">
                The downloaded ticket is an HTML file. Open it in your
                browser to view or print it. The QR code is a booking
                reference, not proof of payment.
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Checkout form.
  return (
    <section className="min-h-screen bg-slate-50 px-5 py-12 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={onBack}
          className="mb-7 font-bold text-slate-600 transition hover:text-blue-700"
        >
          ← Back to event details
        </button>

        <div className="grid items-start gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">
              Almost there
            </p>

            <h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">
              Complete your booking
            </h1>

            <p className="mt-3 leading-7 text-slate-500">
              Enter your details to reserve your tickets.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
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
                  autoComplete="name"
                  maxLength={255}
                  value={form.name}
                  onChange={(e) =>
                    setForm({ ...form, name: e.target.value })
                  }
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                  autoComplete="email"
                  maxLength={255}
                  value={form.email}
                  onChange={(e) =>
                    setForm({ ...form, email: e.target.value })
                  }
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
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
                  autoComplete="tel"
                  pattern="[0-9+() -]{8,20}"
                  maxLength={20}
                  value={form.mobile}
                  onChange={(e) =>
                    setForm({ ...form, mobile: e.target.value })
                  }
                  placeholder="Enter your mobile number"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
                />
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700"
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-full bg-blue-700 px-5 py-4 font-extrabold text-white shadow-lg shadow-blue-700/20 transition duration-300 hover:-translate-y-0.5 hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Confirming your booking..."
                  : "Confirm booking ↗"}
              </button>

              <p className="text-center text-xs leading-5 text-slate-400">
                This demo records a booking in your database. It does not
                process an online payment.
              </p>
            </form>
          </div>

          {/* ORDER SUMMARY */}
          <aside className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="h-48 overflow-hidden bg-slate-200">
              <img
                src={
                  event.img ||
                  "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80"
                }
                alt={event.title}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src =
                    "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1000&q=80";
                }}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="p-6 sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-wider text-blue-700">
                Order summary
              </p>

              <h2 className="mt-3 text-2xl font-black text-slate-950">
                {event.title}
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-500">
                {formatDate(event.date)}
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {event.location}
              </p>

              <div className="my-6 border-t border-dashed border-slate-300" />

              <div className="flex justify-between gap-4 text-sm">
                <span className="text-slate-500">
                  Tickets × {quantity}
                </span>
                <span className="font-bold text-slate-900">
                  ₹{totalAmount.toLocaleString("en-IN")}
                </span>
              </div>

              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-5">
                <span className="font-bold text-slate-900">
                  Total
                </span>
                <span className="text-3xl font-black text-blue-700">
                  {totalAmount === 0
                    ? "Free"
                    : `₹${totalAmount.toLocaleString("en-IN")}`}
                </span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

export default BookingCheckout;
