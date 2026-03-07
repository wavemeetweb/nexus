import React, { useState } from "react";

function Scheduler({ user }) {
  const [events, setEvents] = useState([]);
  const [newEvent, setNewEvent] = useState("");

  const addEvent = () => {
    if (!newEvent) return;
    setEvents([...events, newEvent]);
    setNewEvent("");
  };

  return (
    <div className="scheduler">
      <h2>Scheduler</h2>
      <p>User: {user?.email}</p>
      <input
        type="text"
        placeholder="Add event..."
        value={newEvent}
        onChange={(e) => setNewEvent(e.target.value)}
      />
      <button onClick={addEvent}>Add</button>
      <ul>
        {events.map((event, i) => (
          <li key={i}>{event}</li>
        ))}
      </ul>
    </div>
  );
}

export default Scheduler;
