import React from "react";

export const MockGraph = () => (
  <svg width="100%" height="148" viewBox="0 0 400 148" style={{ position: "absolute", bottom: 0 }}>
    <line x1="40" y1="8" x2="40" y2="130" stroke="#dddbc8" strokeWidth="1" />
    <line x1="40" y1="130" x2="380" y2="130" stroke="#dddbc8" strokeWidth="1" />
    {[80, 140, 200, 260, 320, 370].map((x, i) => (
      <line key={i} x1={x} y1="126" x2={x} y2="134" stroke="#dddbc8" strokeWidth="1" />
    ))}
    <path
      d="M55 115 Q100 20 145 75 Q185 125 220 35 Q258 -15 295 55 Q330 110 365 75"
      fill="none"
      stroke="#6CBDB5"
      strokeWidth="1.8"
    />
    <circle cx="145" cy="75" r="3" fill="#93CCC6" />
    <circle cx="220" cy="35" r="3" fill="#93CCC6" />
    <line x1="168" y1="8" x2="168" y2="130" stroke="#C8D6BF" strokeWidth="1" strokeDasharray="4,4" />
    <line x1="193" y1="8" x2="193" y2="130" stroke="#E3DFBA" strokeWidth="1" strokeDasharray="4,4" />
    <line x1="181" y1="8" x2="181" y2="130" stroke="#6CBDB5" strokeWidth="1.5" strokeDasharray="4,3" />
  </svg>
);
