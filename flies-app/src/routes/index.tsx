import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="px-8 py-12 typeset flex flex-col items-center justify-center gap-1">
      <h1 className="text-4xl">Flies</h1>
      <div>
        This will someday be a landing page, explaining what Flies is and so on.
      </div>
    </div>
  );
}
