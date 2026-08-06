export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
      <h1 className="t-heading-s">{title}</h1>
      <p className="t-body-m">Coming soon.</p>
    </div>
  );
}
