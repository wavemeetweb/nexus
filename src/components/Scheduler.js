import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  updateDoc
} from "firebase/firestore";
import "./Scheduler.css";

/**
 * Scheduler Component
 * Zoom-style meeting scheduler with calendar UI, recurring meetings, reminders, and Firebase persistence
 */
function Scheduler({ user }) {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [recurring, setRecurring] = useState(false);
  const [error, setError] = useState("");
  const [editingEvent, setEditingEvent] = useState(null);

  // Load events from Firestore
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "events"), (snapshot) => {
      setEvents(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  // Add event
  const addEvent = async () => {
    if (!newEvent || !date || !time) {
      setError("Please fill in all fields.");
      return;
    }
    try {
      await addDoc(collection(db, "events"), {
        title: newEvent,
        date,
        time,
        recurring,
        createdBy: user.email
      });
      setNewEvent("");
      setDate("");
      setTime("");
      setRecurring(false);
      setError("");
    } catch (err) {
      setError("Failed to add event: " + err.message);
    }
  };

  // Edit event
  const editEvent = async () => {
    if (!editingEvent) return;
    try {
      await updateDoc(doc(db, "events", editingEvent.id), {
        title: editingEvent.title,
        date: editingEvent.date,
        time: editingEvent.time,
        recurring: editingEvent.recurring
      });
      setEditingEvent(null);
    } catch (err) {
      setError("Failed to edit event: " + err.message);
    }
  };

  // Delete event
  const deleteEvent = async (id) => {
    try {
      await deleteDoc(doc(db, "events", id));
    } catch (err) {
      setError("Failed to delete event: " + err.message);
    }
  };

  return (
    <div className="scheduler-panel">
      <header className="scheduler-header">
        <h3>Meeting Scheduler</h3>
        <p>User: {user?.email}</p>
      </header>

      {error && <p className="error-message">{error}</p>}

      <div className="scheduler-form">
        <input
          type="text"
          placeholder="Meeting title..."
          value={newEvent}
          onChange={(e) => setNewEvent(e.target.value)}
        />
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />
        <label>
          <input
            type="checkbox"
            checked={recurring}
            onChange={() => setRecurring(!recurring)}
          />
          Recurring
        </label>
        <button onClick={addEvent}>Add Event</button>
      </div>

      {/* Event list */}
      <ul className="event-list">
        {events.map((event) => (
          <li key={event.id} className="event-item">
            <div className="event-info">
              <strong>{event.title}</strong>
              <span>{event.date} at {event.time}</span>
              {event.recurring && <span className="recurring">🔁 Recurring</span>}
            </div>
            <div className="event-controls">
              <button onClick={() => setEditingEvent(event)}>Edit</button>
              <button className="delete" onClick={() => deleteEvent(event.id)}>Delete</button>
            </div>
          </li>
        ))}
      </ul>

      {/* Edit modal */}
      {editingEvent && (
        <div className="edit-modal">
          <h4>Edit Event</h4>
          <input
            type="text"
            value={editingEvent.title}
            onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
          />
          <input
            type="date"
            value={editingEvent.date}
            onChange={(e) => setEditingEvent({ ...editingEvent, date: e.target.value })}
          />
          <input
            type="time"
            value={editingEvent.time}
            onChange={(e) => setEditingEvent({ ...editingEvent, time: e.target.value })}
          />
          <label>
            <input
              type="checkbox"
              checked={editingEvent.recurring}
              onChange={() => setEditingEvent({ ...editingEvent, recurring: !editingEvent.recurring })}
            />
            Recurring
          </label>
          <button onClick={editEvent}>Save</button>
          <button onClick={() => setEditingEvent(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

export default Scheduler;
