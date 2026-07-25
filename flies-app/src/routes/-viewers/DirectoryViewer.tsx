import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "#/components/ui/item";
import {
  IconDotsVertical,
  IconFile,
  IconFolder,
  IconFolderUp,
  IconPlus,
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
import type { RemoteFileSystem } from "#/fs/fs";
import { useState } from "react";

export default function DirectoryViewer({ path }: { path: string }) {
  const fs = useFs();

  const children = useQuery({
    queryKey: ["directory-children", fs.getRoot().id, path],
    queryFn: () => fs.listDirectory(path),
  });

  const [isNewFolderDialogOpen, setIsNewFolderDialogOpen] = useState(false);
  const [isNewFileDialogOpen, setIsNewFileDialogOpen] = useState(false);

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
            link:
              fs.getRoot().id + "/" + path.split("/").slice(0, -1).join("/"),
            hasActions: false as const,
          },
        ]
      : []),
    ...children.data!.map((child) => ({
      ...child,
      link: fs.getRoot().id + child.path,
      hasActions: true as const,
    })),
  ].sort((a, b) => {
    if (a.type === b.type) {
      return a.name.localeCompare(b.name);
    }
    return a.type === "directory" ? -1 : 1;
  });

  return (
    <div className="p-8">
      <PathBreadcrumbs root={fs.getRoot()} path={path} />
      <div className="flex flex-wrap gap-2 mt-6">
        {childElements.map((child) => (
          <FileOrDirectoryItem
            key={child.link}
            type={child.type}
            name={child.name}
            link={child.link}
            onDelete={async () => {
              if (child.hasActions) {
                await fs.deleteFile(child.path);
                children.refetch();
              }
            }}
          />
        ))}

        {/* new directory or file */}
        <Item
          variant="outline"
          className="bg-card max-w-75"
          render={
            <button
              onClick={() => setIsNewFolderDialogOpen(true)}
              className="no-underline cursor-pointer"
            >
              <ItemMedia>
                <IconPlus className="size-5" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>New Directory</ItemTitle>
              </ItemContent>
            </button>
          }
        />
        <NewDirectoryDialog
          fs={fs}
          parent={path}
          isOpen={isNewFolderDialogOpen}
          setIsOpen={setIsNewFolderDialogOpen}
          onCreate={() => children.refetch()}
        />
        <Item
          variant="outline"
          className="bg-card max-w-75"
          render={
            <button
              onClick={() => setIsNewFileDialogOpen(true)}
              className="no-underline cursor-pointer"
            >
              <ItemMedia>
                <IconPlus className="size-5" />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>New File</ItemTitle>
              </ItemContent>
            </button>
          }
        />
        <NewFileDialog
          fs={fs}
          parent={path}
          isOpen={isNewFileDialogOpen}
          setIsOpen={setIsNewFileDialogOpen}
          onCreate={() => children.refetch()}
        />
      </div>
    </div>
  );
}

function FileOrDirectoryItem({
  type,
  name,
  link,
  onDelete,
}: {
  type: "file" | "directory";
  name: string;
  link: string;
  onDelete: () => void;
}) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  return (
    <>
      <Item
        variant="outline"
        className="bg-card max-w-75"
        render={
          <Link to="/$" params={{ _splat: link }} className="no-underline">
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
            <ItemContent>
              <ItemTitle>{name}</ItemTitle>
            </ItemContent>
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
                      render={<Link to="/$" params={{ _splat: link }} />}
                    >
                      Open
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        setIsDeleteDialogOpen(true);
                      }}
                    >
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ItemActions>
            )}
          </Link>
        }
      />
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <b>{name}</b>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={onDelete}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function NewFileDialog({
  fs,
  parent,
  isOpen,
  setIsOpen,
  onCreate,
}: {
  fs: RemoteFileSystem;
  parent: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onCreate: () => void;
}) {
  const [newFileName, setNewFileName] = useState("");
  const createFile = async () => {
    const newFilePath = parent + "/" + newFileName;
    await fs.createFile(newFilePath);
    setIsOpen(false);
    onCreate();
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New File</DialogTitle>
          <DialogDescription>Enter a name for the new file.</DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor="new-file-name">File Name</Label>
            <Input
              name="new-file-name"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={createFile}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NewDirectoryDialog({
  fs,
  parent,
  isOpen,
  setIsOpen,
  onCreate,
}: {
  fs: RemoteFileSystem;
  parent: string;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  onCreate: () => void;
}) {
  const [newDirectoryName, setNewDirectoryName] = useState("");
  const createDirectory = async () => {
    const newDirectoryPath = parent + "/" + newDirectoryName;
    await fs.createDirectory(newDirectoryPath);
    setIsOpen(false);
    onCreate();
  };
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Directory</DialogTitle>
          <DialogDescription>
            Enter a name for the new directory.
          </DialogDescription>
        </DialogHeader>
        <FieldGroup>
          <Field>
            <Label htmlFor="new-directory-name">Directory Name</Label>
            <Input
              name="new-directory-name"
              value={newDirectoryName}
              onChange={(e) => setNewDirectoryName(e.target.value)}
            />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          <Button onClick={createDirectory}>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
