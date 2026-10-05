import { Link } from "@tanstack/react-router";
import { cn } from "cn";

export default function FliesHomeLogo({ className }: { className?: string }) {
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
