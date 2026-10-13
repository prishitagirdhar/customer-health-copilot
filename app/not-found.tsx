import Link from "next/link";

export default function NotFound() {
  return (
    <main>
      <h1>Page not found</h1>
      <p className="sub">That page or account does not exist in the simulated dataset.</p>
      <Link className="btn" href="/">Back to dashboard</Link>
    </main>
  );
}
