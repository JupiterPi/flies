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

type NavigationItem = {
  title: string;
  href: string;
}[];

const Navbar = ({ navigationData }: { navigationData: NavigationItem }) => {
  return (
    <header className="bg-sidebar sticky top-0 z-50 border-b border-border">
      <div className="flex justify-between gap-8 px-4 py-4 sm:px-6">
        <div className="text-muted-foreground flex flex-1 items-center gap-8 font-medium">
          <Link to="/" className="flex items-center gap-2 dark:invert">
            <img
              src="/src/flies-logo.ico"
              alt="Flies Logo"
              className="h-8 w-8"
            />
          </Link>
          {/* <a href="#" className="hover:text-primary max-md:hidden">
            Home
          </a>
          <a href="#" className="hover:text-primary max-md:hidden">
            Products
          </a>
          <a href="#" className="hover:text-primary max-md:hidden">
            About Us
          </a>
          <a href="#" className="hover:text-primary max-md:hidden">
            Contact Us
          </a> */}
          <Link to="/config" className="hover:text-primary max-md:hidden">
            Flies Config
          </Link>
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
                {navigationData.map((item, index) => (
                  <DropdownMenuItem key={index}>
                    <a href={item.href}>{item.title}</a>
                  </DropdownMenuItem>
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
