import React from "react";

export const Card = ({ type, tag, title, body, children }) => {
  return (
    <div className={`card ${type}`}>
      <div className="card-tag">{tag}</div>
      <div className="card-title">{title}</div>
      <p className="card-body">{body}</p>
      {children}
    </div>
  );
};
