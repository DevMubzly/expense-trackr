import { NotFoundGlitch } from "@/components/motion/not-found/glitch";

export default function NotFound() {
  return (
    <NotFoundGlitch
      title="Lost the receipt"
      description="That page doesn't exist — or it was spent and never written down. Try one of these instead."
      homeHref="/"
      homeLabel="Back to dashboard"
      browseHref="/expenses"
      browseLabel="Browse expenses"
    />
  );
}
