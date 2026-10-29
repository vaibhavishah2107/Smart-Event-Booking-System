
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");
const app = express();
app.get("/api/test-route", (req, res) => {
  res.json({ message: "Correct backend is running" });
});

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
    ],
  })
);

app.use(express.json());

// --------------------------------------------------
// HOME / HEALTH CHECKS
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "Smart Event Booking API is running!",
  });
});

app.get("/api/health/db", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({ message: "MySQL connected successfully" });
  } catch (error) {
    console.error("Database health check failed:", error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// --------------------------------------------------
// ADMIN AUTHORIZATION
// Configure ADMIN_API_KEY in your backend .env file.
// Send it in the x-admin-key request header.
// --------------------------------------------------

function requireAdmin(req, res, next) {
  const adminKey = process.env.ADMIN_API_KEY;

  if (!adminKey || req.get("x-admin-key") !== adminKey) {
    return res.status(401).json({
      message: "Unauthorized: admin access required",
    });
  }

  next();
}
app.get("/api/admin/verify", requireAdmin, (req, res) => {
  res.json({
    success: true,
    message: "Admin key is valid",
  });
});

// --------------------------------------------------
// GET /api/events
// List, search and filter events.
// Optional query parameters:
// ?search=music
// ?location=Gwalior
// ?date=2026-11-03
// ?from=2026-11-01&to=2026-11-30
// --------------------------------------------------

app.get("/api/events", async (req, res) => {
  try {
    const { search, location, date, from, to } = req.query;

    let sql = "SELECT * FROM events WHERE 1 = 1";
    const values = [];

    if (search) {
      sql += " AND (title LIKE ? OR description LIKE ?)";
      values.push(`%${search}%`, `%${search}%`);
    }

    if (location) {
      sql += " AND location LIKE ?";
      values.push(`%${location}%`);
    }

    if (date) {
      sql += " AND DATE(date) = ?";
      values.push(date);
    }

    if (from) {
      sql += " AND date >= ?";
      values.push(`${from} 00:00:00`);
    }

    if (to) {
      sql += " AND date <= ?";
      values.push(`${to} 23:59:59`);
    }

    sql += " ORDER BY date ASC";

    const [events] = await db.execute(sql, values);

    res.json(events);
  } catch (error) {
    console.error("Fetching events failed:", error.message);
    res.status(500).json({ message: "Could not fetch events" });
  }
});

// --------------------------------------------------
// GET /api/events/:id
// Get event details and current seat availability.
// --------------------------------------------------

app.get("/api/events/:id", async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const [events] = await db.execute(
      "SELECT * FROM events WHERE id = ?",
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    res.json(events[0]);
  } catch (error) {
    console.error("Fetching event failed:", error.message);
    res.status(500).json({ message: "Could not fetch event" });
  }
});

// --------------------------------------------------
// POST /api/events
// Create an event (admin only).
//
// Body:
// {
//   "title": "Tech Summit",
//   "description": "Technology event",
//   "location": "Gwalior",
//   "date": "2026-11-15 10:00:00",
//   "total_seats": 100,
//   "price": 499,
//   "img": "https://example.com/event.jpg"
// }
// --------------------------------------------------

app.post("/api/events", requireAdmin, async (req, res) => {
  try {
    const {
      title,
      description = "",
      location,
      date,
      total_seats,
      price,
      img = null,
    } = req.body;

    if (
      !title?.trim() ||
      !location?.trim() ||
      !date ||
      total_seats === undefined ||
      price === undefined
    ) {
      return res.status(400).json({
        message: "Title, location, date, total seats and price are required",
      });
    }

    const seats = Number(total_seats);
    const eventPrice = Number(price);

    if (
      !Number.isInteger(seats) ||
      seats < 0 ||
      !Number.isFinite(eventPrice) ||
      eventPrice < 0
    ) {
      return res.status(400).json({
        message: "Seats must be a non-negative integer and price must be non-negative",
      });
    }

    const [result] = await db.execute(
      `INSERT INTO events
       (title, description, location, date, total_seats,
        available_seats, price, img)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title.trim(),
        description,
        location.trim(),
        date,
        seats,
        seats,
        eventPrice,
        img,
      ]
    );

    res.status(201).json({
      message: "Event created successfully",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Creating event failed:", error.message);
    res.status(500).json({ message: "Could not create event" });
  }
});

// --------------------------------------------------
// PUT /api/events/:id
// Update an event (admin only).
// Prevents the seat limit being reduced below tickets
// that have already been booked.
// --------------------------------------------------

app.put("/api/events/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  const connection = await db.getConnection();

  try {
    const {
      title,
      description = "",
      location,
      date,
      total_seats,
      price,
      img = null,
    } = req.body;

    if (
      !title?.trim() ||
      !location?.trim() ||
      !date ||
      total_seats === undefined ||
      price === undefined
    ) {
      return res.status(400).json({
        message: "Title, location, date, total seats and price are required",
      });
    }

    const seats = Number(total_seats);
    const eventPrice = Number(price);

    if (
      !Number.isInteger(seats) ||
      seats < 0 ||
      !Number.isFinite(eventPrice) ||
      eventPrice < 0
    ) {
      return res.status(400).json({
        message: "Invalid seat count or price",
      });
    }

    await connection.beginTransaction();

    const [events] = await connection.execute(
      "SELECT * FROM events WHERE id = ? FOR UPDATE",
      [id]
    );

    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Event not found" });
    }

    const existingEvent = events[0];

    const bookedSeats =
      Number(existingEvent.total_seats) -
      Number(existingEvent.available_seats);

    if (seats < bookedSeats) {
      await connection.rollback();

      return res.status(409).json({
        message: `Cannot set total seats below the ${bookedSeats} tickets already booked`,
      });
    }

    const availableSeats = seats - bookedSeats;

    await connection.execute(
      `UPDATE events
       SET title = ?, description = ?, location = ?, date = ?,
           total_seats = ?, available_seats = ?, price = ?, img = ?
       WHERE id = ?`,
      [
        title.trim(),
        description,
        location.trim(),
        date,
        seats,
        availableSeats,
        eventPrice,
        img,
        id,
      ]
    );

    await connection.commit();

    res.json({ message: "Event updated successfully" });
  } catch (error) {
    await connection.rollback();
    console.error("Updating event failed:", error.message);
    res.status(500).json({ message: "Could not update event" });
  } finally {
    connection.release();
  }
});

// --------------------------------------------------
// DELETE /api/events/:id
// Delete an event (admin only).
// Events with existing bookings are not deleted.
// --------------------------------------------------

app.delete("/api/events/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isInteger(id) || id < 1) {
    return res.status(400).json({ message: "Invalid event ID" });
  }

  try {
    const [events] = await db.execute(
      "SELECT id FROM events WHERE id = ?",
      [id]
    );

    if (events.length === 0) {
      return res.status(404).json({ message: "Event not found" });
    }

    const [bookings] = await db.execute(
      "SELECT id FROM bookings WHERE event_id = ? LIMIT 1",
      [id]
    );

    if (bookings.length > 0) {
      return res.status(409).json({
        message: "This event has bookings and cannot be deleted",
      });
    }

    await db.execute("DELETE FROM events WHERE id = ?", [id]);

    res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Deleting event failed:", error.message);
    res.status(500).json({ message: "Could not delete event" });
  }
});

// --------------------------------------------------
// POST /api/bookings
// Book tickets with transaction-based seat checks.
// Uses your existing bookings table.
// --------------------------------------------------

app.post("/api/bookings", async (req, res) => {
  console.log("POST /api/bookings route reached");
  const { event_id, name, email, mobile, quantity } = req.body;

  const eventId = Number(event_id);
  const ticketCount = Number(quantity);

  if (
    !Number.isInteger(eventId) ||
    eventId < 1 ||
    !name?.trim() ||
    !email?.trim() ||
    !mobile?.trim() ||
    !Number.isInteger(ticketCount) ||
    ticketCount < 1 ||
    ticketCount > 10
  ) {
    return res.status(400).json({
      message: "Enter valid booking details and select 1–10 tickets",
    });
  }

  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // Lock this event while checking and reserving seats.
    const [events] = await connection.execute(
      "SELECT * FROM events WHERE id = ? FOR UPDATE",
      [eventId]
    );

    if (events.length === 0) {
      await connection.rollback();
      return res.status(404).json({ message: "Event not found" });
    }

    const event = events[0];

    if (Number(event.available_seats) < ticketCount) {
      await connection.rollback();

      return res.status(409).json({
        message: "Not enough seats available",
        available_seats: Number(event.available_seats),
      });
    }

    const totalAmount = (
      Number(event.price) * ticketCount
    ).toFixed(2);

    const [result] = await connection.execute(
      `INSERT INTO bookings
       (event_id, name, email, mobile, quantity, total_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, 'confirmed')`,
      [
        eventId,
        name.trim(),
        email.trim(),
        mobile.trim(),
        ticketCount,
        totalAmount,
      ]
    );

    await connection.execute(
      `UPDATE events
       SET available_seats = available_seats - ?
       WHERE id = ?`,
      [ticketCount, eventId]
    );

    await connection.commit();

    res.status(201).json({
      message: "Booking confirmed successfully",
      booking_id: result.insertId,
      event_id: eventId,
      event_title: event.title,
      event_date: event.date,
      location: event.location,
      quantity: ticketCount,
      total_amount: totalAmount,
      currency: "INR",
      status: "confirmed",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Booking failed:", error.message);
    res.status(500).json({ message: "Could not complete booking" });
  } finally {
    connection.release();
  }
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
