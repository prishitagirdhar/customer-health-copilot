export default function Loading() {
  return (
    <main aria-busy="true" aria-label="Loading">
      <div className="skel" style={{ height: 32, width: 260, marginBottom: 12 }} />
      <div className="skel" style={{ height: 16, width: 420, maxWidth: "100%", marginBottom: 24 }} />
      <div className="grid kpis">
        {[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 96 }} />)}
      </div>
      <div className="skel" style={{ height: 320 }} />
    </main>
  );
}
