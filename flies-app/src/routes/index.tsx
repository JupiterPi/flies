import { readConfigurationFromLocalStorage } from "#/data/configuration";
import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <div className="px-8 py-12 typeset flex flex-col items-center justify-center gap-1">
      <h1 className="text-4xl">Flies</h1>
      <div>
        This will someday be a landing page, explaining what Flies is and so on.
      </div>

      {/* roots */}
      <h2>Your Roots</h2>
      <div className="flex flex-col">
        {readConfigurationFromLocalStorage()?.roots.map((root) => (
          <div key={root.id}>
            <Link
              to={"/$"}
              params={{
                _splat: root.id,
              }}
              className="text-base"
            >
              {root.name ?? root.id}
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
