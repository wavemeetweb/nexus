import React from "react";

function Participants() {
  const participants = ["Alice", "Bob", "Charlie"]; // placeholder

  return (
    <div className="participants">
      <h2>Participants</h2>
      <ul>
        {participants.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </div>
  );
}

export default Participants;
