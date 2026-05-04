"use client";

export default function GlobalError() {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f8fafc" }}>
        <div style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          textAlign: "center",
          gap: "1.25rem",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#fee2e2", display: "flex", alignItems: "center",
            justifyContent: "center", fontSize: 32,
          }}>
            ⚠️
          </div>
          <div>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#0f172a", margin: "0 0 0.5rem" }}>
              App failed to load
            </h2>
            <p style={{ fontSize: "0.875rem", color: "#475569", margin: 0, maxWidth: 280 }}>
              Something went wrong at startup. Your data is safe — try reloading.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "0.625rem 1.5rem",
              borderRadius: "1rem",
              background: "#16a34a",
              color: "white",
              fontSize: "0.875rem",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Reload app
          </button>
        </div>
      </body>
    </html>
  );
}
