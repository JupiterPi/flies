import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { IconMenu } from "@tabler/icons-react";
import { ModeToggle } from "./theme-toggle";
import { Link } from "@tanstack/react-router";
import { resolveTheme, useTheme } from "./theme-provider";

import fliesLogoLight from "@/flies-logo-light.svg";
import filesLogoDark from "@/flies-logo-dark.svg";

const Navbar = () => {
  const { theme } = useTheme();

  const navigationItems = [{ title: "Flies Config", href: "/config" }];

  return (
    <header className="bg-sidebar sticky top-0 z-50 border-b border-border">
      <div className="flex justify-between gap-8 px-4 py-4 sm:px-6">
        <div className="text-muted-foreground flex flex-1 items-center gap-8 font-medium">
          <Link to="/" className="flex items-center gap-2">
            {resolveTheme(theme) === "dark" ? (
              <img src={filesLogoDark} alt="Flies Logo" className="h-8 w-8" />
            ) : (
              <img src={fliesLogoLight} alt="Flies Logo" className="h-8 w-8" />
            )}
          </Link>
          {navigationItems.map((item, index) => (
            <Link
              key={index}
              to={item.href}
              className="hover:text-primary max-md:hidden"
            >
              {item.title}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <ModeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger
              className="md:hidden"
              render={<Button variant="outline" size="icon" />}
            >
              <IconMenu />
              <span className="sr-only">Menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuGroup>
                {navigationItems.map((item, index) => (
                  <DropdownMenuItem
                    key={index}
                    render={<Link to={item.href}>{item.title}</Link>}
                  />
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
