import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "#/components/ui/item";
import {
  IconArrowRight,
  IconDotsVertical,
  IconDownload,
  IconEdit,
  IconFile,
  IconFolder,
  IconFolderUp,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { LoadingPage, PathBreadcrumbs, useFs } from "../$";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "#/components/ui/button";
import { Field, FieldGroup } from "#/components/ui/field";
import { Label } from "#/components/ui/label";
import { Input } from "#/components/ui/input";
import { useEffect, useState } from "react";

export default function DirectoryViewer({ path }: { path: string }) {
  const fs = useFs();

  const children = useQuery({
    queryKey: ["directory-children", fs.getRoot().id, path],
    queryFn: () => fs.listDirectory(path),
  });

  if (children.isLoading) {
    return <LoadingPage />;
  }
  if (children.isError) {
    return (
      <div>Error fetching directory contents: {String(children.error)}</div>
    );
  }

  const childElements = [
    ...(path !== "" && path !== "/"
      ? [
          {
            type: "directory" as const,
            name: "..",
            path: "/" + path.split("/").slice(0, -1).join("/"),
            hasActions: false,
          },
        ]
      : []),
    ...children.data!.map((child) => ({
      ...child,
      hasActions: true,
    })),
  ].sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === "directory" ? -1 : 1;
  });

  return (
    <div className="p-8">
      <PathBreadcrumbs path={path} />
      <div className="flex flex-wrap gap-2 mt-6">
        {childElements.map((child) => (
          <FileOrDirectoryItem
            key={child.path}
            type={child.type}
            name={child.name}
            path={child.path}
            onRefresh={() => children.refetch()}
          />
        ))}

        {(["file", "directory"] as const).map((type) => (
          <CreateFileOrDirectoryItem
            key={type}
            parent={path}
            type={type}
            onRefresh={() => children.refetch()}
          />
        ))}
      </div>
    </div>
  );
}

function FileOrDirectoryItem({
  type,
  name,
  path,
  onRefresh,
}: {
  type: "file" | "directory";
  name: string;
  path: string;
  onRefresh: () => void;
}) {
  const fs = useFs();
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  return (
    <>
      <Item
        variant="outline"
        className="bg-card w-75"
        render={
          <Link
            to="/$"
            params={{ _splat: fs.getRoot().id + path }}
            className="no-underline flex flex-nowrap! justify-stretch"
          >
            <ItemMedia>
              {type === "directory" ? (
                name === ".." ? (
                  <IconFolderUp className="size-5" />
                ) : (
                  <IconFolder className="size-5" />
                )
              ) : (
                <IconFile className="size-5" />
              )}
            </ItemMedia>
            <div className="flex-1 truncate">{name}</div>
            {name !== ".." && (
              <ItemActions>
                <DropdownMenu>
                  <DropdownMenuTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(e) => e.preventDefault()}
                      >
                        <IconDotsVertical className="size-5" />
                      </Button>
                    }
                  />
                  <DropdownMenuContent onClick={(e) => e.preventDefault()}>
                    <DropdownMenuItem
                      render={
                        <Link
                          to="/$"
                          params={{ _splat: fs.getRoot().id + path }}
                        />
                      }
                    >
                      <IconArrowRight />
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setIsRenameDialogOpen(true)}
                    >
                      <IconEdit />
                      Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        const downloadLink = fs.getFileDownloadLink(path);
                        window.open(downloadLink, "_blank");
                      }}
                    >
                      <IconDownload />
                      Download
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      <IconTrash />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ItemActions>
            )}
          </Link>
        }
      />
      <DeleteItemDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        path={path}
        onRefresh={onRefresh}
      />
      <RenameItemDialog
        isOpen={isRenameDialogOpen}
        onOpenChange={setIsRenameDialogOpen}
        path={path}
        type={type}
        onRefresh={onRefresh}
      />
    </>
  );
}

function DeleteItemDialog({
  isOpen,
  onOpenChange,
  path,
  onRefresh,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  path: string;
  onRefresh: () => void;
}) {
  const fs = useFs();
  const basename = path.split("/").slice(-1)[0];
  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete <b>{basename}</b>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            onClick={async () => {
              await fs.deleteFile(path);
              onRefresh();
            }}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function CreateFileOrDirectoryItem({
  parent,
  type,
  onRefresh,
}: {
  parent: string;
  type: "file" | "directory";
  onRefresh: () => void;
}) {
  const fs = useFs();
  const typeName = type === "file" ? "File" : "Directory";
  const [isOpen, setIsOpen] = useState(false);
  const [newName, setNewName] = useState("");
  useEffect(() => {
    if (!isOpen) {
      setNewName("");
    }
  }, [isOpen]);
  return (
    <>
      <Item
        variant="outline"
        className="bg-card max-w-75"
        render={
          <button
            onClick={() => setIsOpen(true)}
            className="no-underline cursor-pointer"
          >
            <ItemMedia>
              <IconPlus className="size-5" />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>New {typeName}</ItemTitle>
            </ItemContent>
          </button>
        }
      />
      <Dialog open={isOpen} onOpenChange={(open) => setIsOpen(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {typeName}</DialogTitle>
            <DialogDescription>
              Enter a name for the new {typeName}.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="new-name">{typeName} Name</Label>
              <Input
                name="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline">Cancel</Button>} />
            <Button
              onClick={async () => {
                const newItemPath = parent + "/" + newName;
                await (type === "file"
                  ? fs.createFile(newItemPath)
                  : fs.createDirectory(newItemPath));
                setIsOpen(false);
                onRefresh();
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RenameItemDialog({
  isOpen,
  onOpenChange,
  path,
  type,
  onRefresh,
}: {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  path: string;
  type: "file" | "directory";
  onRefresh: () => void;
}) {
  const fs = useFs();
  const typeName = type === "file" ? "File" : "Directory";
  const [newName, setNewName] = useState("");
  useEffect(() => {
    if (!isOpen) {
      setNewName("");
    }
  }, [isOpen]);
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename {typeName}</DialogTitle>
          <DialogDescription>
            Enter a new name for the {typeName}.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor="new-name">{typeName} Name</Label>
            <Input
              name="new-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button
            onClick={async () => {
              const newItemPath = [
                ...path.split("/").slice(0, -1),
                newName,
              ].join("/");
              await fs.moveFileOrDirectory(path, newItemPath);
              onRefresh();
            }}
          >
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
