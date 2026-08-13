import { Link } from 'wouter';
import { ArrowLeft, Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="venue-grid flex min-h-[100dvh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 shadow-xl" data-testid="page-not-found">
        <Compass className="mb-7 h-12 w-12 text-primary" />
        <div className="font-mono text-[10px] uppercase tracking-[.2em] text-primary">Signal lost / 404</div>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">That gate isn’t on the map.</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">The page you’re looking for doesn’t belong to this event flow.</p>
        <Link href="/" className="mt-8 inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground" data-testid="link-return-home"><ArrowLeft className="h-4 w-4" /> Return to scanner</Link>
      </div>
    </div>
  );
}
