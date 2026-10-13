export default function Placeholder({ title, blurb }: { title: string; blurb: string }) {
  return (
    <main>
      <h1>{title}</h1>
      <p className="sub">{blurb}</p>
      <div className="card empty">Coming soon. This page is a placeholder.</div>
    </main>
  );
}
