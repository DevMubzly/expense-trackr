import { NotFoundGlitch } from "@/components/motion/not-found/glitch";

export default function NotFound() {
  return (
    <div className="flex min-h-[calc(100dvh_-_6rem)] items-center justify-center">
      <NotFoundGlitch
        title="Lost the receipt"
        description="That page does not exist, or it was spent and never written down. Try one of these instead."
        homeHref="/"
        homeLabel="Back to dashboard"
        browseHref="/expenses"
        browseLabel="Browse expenses"
      />
    </div>
  );
}
