"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main>
      <h1>Something went wrong</h1>
      <p className="sub">{error.message || "An unexpected error occurred."}</p>
      <p className="hint">If the data file is missing, run <code>npm run seed</code> and reload.</p>
      <button type="button" className="btn" onClick={reset}>Try again</button>
    </main>
  );
}
