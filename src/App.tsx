import FlowerOfLifeClock from "./FlowerOfLifeClock";

function SponsorLink() {
  return (
    <a
      href="https://github.com/sponsors/eVirgil"
      target="_blank"
      rel="noreferrer"
      aria-label="Sponsor this project"
      className="fixed bottom-4 right-4 z-50 text-xs tracking-wide text-white/35 transition hover:text-white/70 focus:text-white/80 focus:outline-none"
    >
      Sponsor this work
    </a>
  );
}

export default function App() {
  return (
    <main className="min-h-screen bg-black flex items-center justify-center">
      <FlowerOfLifeClock/>
      <SponsorLink />
    </main>
  );
}