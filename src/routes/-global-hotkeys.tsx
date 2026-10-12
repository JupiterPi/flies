import { useServer } from "#/client/orpc";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "#/components/ui/command";
import { useHotkey } from "@tanstack/react-hotkeys";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { LoadingPage } from "./$";
import { useNavigate } from "@tanstack/react-router";

export function GlobalHotkeys() {
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

  const { queries } = useServer();
  const { isLoading, data: searchResults } = useQuery(
    queries.fs.search.queryOptions({
      input: { query: searchQuery, type: "any" },
    }),
  );

  const navigate = useNavigate();
  return (
    <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
      <Command shouldFilter={false}>
        <CommandInput
          placeholder="Search files and directories..."
          value={searchQuery}
          onValueChange={setSearchQuery}
        />
        <CommandList>
          {isLoading && <LoadingPage />}
          {!searchResults ||
            (searchResults.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            ))}
          {searchResults && searchResults.length > 0 && (
            <CommandGroup heading="Files and Directories">
              {searchResults?.map((result, i) => (
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
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
