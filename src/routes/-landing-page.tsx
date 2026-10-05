import FliesHomeLogo from "#/components/FliesHomeLogo";
import { ModeToggle } from "#/components/theme-toggle";
import { Button } from "#/components/ui/button";
import { IconBrandGithub } from "@tabler/icons-react";

export default function LandingPage({
  onShowLoginPage,
}: {
  onShowLoginPage: () => void;
}) {
  return (
    <>
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>
      <div className="px-8 py-12 typeset flex flex-col items-center justify-center gap-8">
        <h1 className="text-4xl flex gap-4 items-center">
          <FliesHomeLogo className="size-12" /> Flies
        </h1>

        <p className="m-0 italic">Is that a typo?</p>

        <p className="m-0 text-center text-lg max-w-xl">
          Welcome to Flies, a self-hosted cloud storage and knowledge-management
          platform where everything is a file!
        </p>

        <a
          href="https://github.com/JupiterPi/flies"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button variant="outline">
            <IconBrandGithub />
            Visit the project on GitHub
          </Button>
        </a>

        <div className="flex flex-col gap-2 items-center text-center">
          Already have an account on this instance?
          <Button onClick={onShowLoginPage}>Log in</Button>
        </div>
      </div>
    </>
  );
}
