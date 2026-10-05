import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { cn } from "cn";

export const Route = createFileRoute("/_loggedIn")({
  ssr: false, // todo: can this be removed now that window.prompt isn't used anymore?
  component: RouteComponent,
});

function RouteComponent() {
  return <Outlet />;
}

export function FliesHomeLogo({ className }: { className?: string }) {
  return (
    <Link to="/">
      <img
        src="/flies-logo.svg"
        alt="Flies Logo"
        className={cn("m-0!", className)}
      />
    </Link>
  );
}

// todo: remove this layout route
