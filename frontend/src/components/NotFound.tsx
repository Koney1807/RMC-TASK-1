export default function NotFound() {
  return (
    <div className="page">
      <div className="card" style={{ textAlign: "center" }}>
        <p className="not-found-code">404</p>
        <h1 style={{ fontSize: 22, marginBottom: 10 }}>Page not found</h1>
        <p className="subtitle" style={{ marginBottom: 26 }}>
          That page doesn't exist. Head back to the registration form to get started.
        </p>
        <a className="btn-primary" href="/" style={{ display: "inline-block", textDecoration: "none" }}>
          ← Back home
        </a>
      </div>
    </div>
  );
}
