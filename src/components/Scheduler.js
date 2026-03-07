import React, { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

function Scheduler({ user }) {
  const [meeting, setMeeting] = useState("");

  const scheduleMeeting = async () => {
    await addDoc(collection(db, "meetings"), {
      title: meeting,
      host: user.email,
      date: new Date().toISOString()
    });
    setMeeting("");
  };

  return (
    <div className="scheduler">
      <h2>Schedule Meeting</h2>
      <input value={meeting} onChange={(e) => setMeeting(e.target.value)} />
      <button onClick={scheduleMeeting}>Schedule</button>
    </div>
  );
}

export default Scheduler;
