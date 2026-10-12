import { useServer } from "#/client/orpc";
import {
  Command,
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
} from "#/components/ui/command";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { LoadingPage } from "./$";
import { useNavigate } from "@tanstack/react-router";

export const GlobalHotkeysContext = createContext<{
  isSearchOpen: boolean;
  setIsSearchOpen: (open: boolean) => void;
} | null>(null);

export function useGlobalHotkeys() {
  const context = useContext(GlobalHotkeysContext);
  if (!context) {
    throw new Error(
      "useGlobalHotkeys must be used within a GlobalHotkeysProvider",
    );
  }
  return { openSearch: () => context.setIsSearchOpen(true) };
}

export function GlobalSearchHotkey({
  children,
}: {
  children?: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  useHotkey("Mod+O", () => setIsOpen(true));

  const [searchQuery, setSearchQuery] = useState<string>("");
  useEffect(() => {
    if (!isOpen) {
      const timeout = setTimeout(() => {
        setSearchQuery("");
      }, 100); // wait for closing animation
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  const [effectiveSearchQuery, resultPreference] = (() => {
    if (searchQuery.startsWith('"')) {
      return [searchQuery.slice(1), "inFile" as const];
    }
    return [searchQuery, "inPath" as const];
  })();

  const { queries } = useServer();
  const { isLoading, data: results } = useQuery(
    queries.fs.search.queryOptions({
      input: { query: effectiveSearchQuery, type: "any" },
    }),
  );

  const inPathResults = results && results.path.length > 0 && (
    <CommandGroup heading="Files and Directories">
      {results.path.map((result, i) => (
        <CommandItem
          key={i}
          onSelect={() => {
            navigate({ to: "/$", params: { _splat: result.path } });
            setIsOpen(false);
          }}
        >
          {result.path}
        </CommandItem>
      ))}
    </CommandGroup>
  );
  const inFileResults = results && results.content.length > 0 && (
    <CommandGroup heading="In Files">
      {results.content.map((result, i) => (
        <CommandItem
          key={i}
          onSelect={() => {
            navigate({ to: "/$", params: { _splat: result.path } });
            setIsOpen(false);
          }}
        >
          <div className="flex flex-col items-start gap-1">
            <div>
              {result.path}{" "}
              <span className="text-muted-foreground">:{result.line}</span>
            </div>
            <div className="italic text-xs whitespace-pre">
              {result.context}
            </div>
          </div>
        </CommandItem>
      ))}
    </CommandGroup>
  );

  const navigate = useNavigate();
  return (
    <>
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search files and directories..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            {isLoading && <LoadingPage />}
            <CommandEmpty>No results found.</CommandEmpty>
            {!isLoading &&
              results &&
              (resultPreference === "inFile" ? (
                <>
                  {inFileResults}
                  {inPathResults}
                </>
              ) : (
                <>
                  {inPathResults}
                  {inFileResults}
                </>
              ))}
          </CommandList>
        </Command>
      </CommandDialog>
      <GlobalHotkeysContext
        value={{ isSearchOpen: isOpen, setIsSearchOpen: setIsOpen }}
      >
        {children}
      </GlobalHotkeysContext>
    </>
  );
}
