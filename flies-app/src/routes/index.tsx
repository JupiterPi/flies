import { readConfigurationFromLocalStorage } from "#/data/configuration";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileOrDirectoryItem } from "./-viewers/DirectoryViewer";
import { NoopFS } from "#/fs/fs";
import { FsContext } from "./$";
import { Button } from "#/components/ui/button";
import { IconAdjustments } from "@tabler/icons-react";
import { ModeToggle } from "#/components/theme-toggle";
import classNames from "classnames";

export const Route = createFileRoute("/")({ component: Home });

export function Home() {
  return (
    <>
      <div className="absolute top-4 right-4 z-50">
        <ModeToggle />
      </div>
      <div className="px-8 py-12 typeset flex flex-col items-center justify-center gap-4">
        <h1 className="text-4xl flex gap-4 items-center">
          <img src="/flies-logo.svg" alt="Flies Logo" className="size-12" />{" "}
          Flies
        </h1>

        {/* roots */}
        <div className="flex flex-col gap-2">
          {readConfigurationFromLocalStorage()?.roots.map((root) => (
            <FsContext value={new NoopFS(root)}>
              <FileOrDirectoryItem
                key={root.id}
                type="directory"
                name={root.name ?? root.id}
                path={""}
                hasActions={false}
                onRefresh={() => {}}
                isRoot={true}
              />
            </FsContext>
          ))}
        </div>

        <Link to="/config">
          <Button>
            <IconAdjustments />
            Configure
          </Button>
        </Link>
      </div>
    </>
  );
}

export function FliesHomeLogo({ className }: { className?: string }) {
  return (
    <Link to="/">
      <img
        src="/flies-logo.svg"
        alt="Flies Logo"
        className={classNames("m-0!", className)}
      />
    </Link>
  );
}
