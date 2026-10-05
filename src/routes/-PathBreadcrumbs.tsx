import FliesHomeLogo from "#/components/FliesHomeLogo";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "#/components/ui/breadcrumb";
import { Button } from "#/components/ui/button";
import { IconCopy, IconDots, IconTrash } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog";
import { useServer } from "#/client/orpc";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { LoadingPage } from "./$";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/toast";
import { toast } from "@/components/ui/toast";
import { useOtherToaster } from "./__root";
import { Badge } from "#/components/ui/badge";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "#/components/ui/field";
import { Input } from "#/components/ui/input";
import { Switch } from "#/components/ui/switch";

export default function PathBreadcrumbs({
  path,
  mayShare,
}: {
  path: string;
  mayShare: boolean;
}) {
  const pathSegments = path.split("/").filter((segment) => segment !== "");
  const [isSharesDialogOpen, setIsSharesDialogOpen] = useState(false);
  return (
    <>
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <FliesHomeLogo className="size-5" />
          </BreadcrumbItem>
          {pathSegments.map((segment, index) => (
            <React.Fragment key={index}>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink
                  render={
                    <Link
                      to="/$"
                      params={{
                        _splat: pathSegments.slice(0, index + 1).join("/"),
                      }}
                      className="text-base"
                    >
                      {segment}
                    </Link>
                  }
                />
              </BreadcrumbItem>
            </React.Fragment>
          ))}
          {/* <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="xs" className="rounded-full">
                  <IconDots />
                </Button>
              }
            />
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => setIsSharingDialogOpen(true)}>
                <IconShare />
                Share
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu> */}
          {mayShare && (
            <Button
              variant="ghost"
              size="xs"
              className="rounded-full"
              onClick={() => setIsSharesDialogOpen(true)}
            >
              <IconDots />
            </Button>
          )}
        </BreadcrumbList>
      </Breadcrumb>
      {mayShare && (
        <SharesDialog
          isOpen={isSharesDialogOpen}
          onClose={() => setIsSharesDialogOpen(false)}
          path={path}
        />
      )}
    </>
  );
}

function SharesDialog({
  isOpen,
  onClose,
  path,
}: {
  isOpen: boolean;
  onClose: () => void;
  path: string;
}) {
  const { client, queries } = useServer();
  const queryClient = useQueryClient();
  const { data: shares, isLoading } = useQuery(
    queries.shares.getSharesForPath.queryOptions({ input: { path } }),
  );
  const deleteShare = async (shareId: string) => {
    await client.shares.deleteShare({ shareId });
    queryClient.invalidateQueries({
      queryKey: queries.shares.getSharesForPath.key(),
    });
  };
  useOtherToaster(isOpen); // so that the toaster is above the dialog

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Shares</DialogTitle>
          </DialogHeader>
          {isLoading && <LoadingPage />}
          {shares && (
            <div className="flex flex-col gap-2">
              {shares.map((share, i) => (
                <DropdownMenu>
                  <DropdownMenuTrigger
                    nativeButton={false}
                    render={
                      <div
                        key={i}
                        className="flex justify-between items-center flex-wrap bg-muted rounded-lg p-2 cursor-pointer"
                      >
                        <div className="flex flex-col gap-0.5 flex-1">
                          <div className="font-mono font-semibold ml-1">
                            {share.path}
                          </div>
                          {share.note && (
                            <div className="text-sm text-muted-foreground ml-1">
                              {share.note}
                            </div>
                          )}
                          <div className="flex gap-2 flex-wrap">
                            {share.allowWrite && (
                              <Badge variant="outline">Write Access</Badge>
                            )}
                            {share.password === null && (
                              <Badge variant="outline">Passwordless</Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          <IconDots />
                        </Button>
                      </div>
                    }
                  />
                  <DropdownMenuContent align="end" className="w-fit">
                    <DropdownMenuItem
                      onClick={() => {
                        navigator.clipboard.writeText(
                          `${window.location.origin}/${share.path}?share=${share.token}`,
                        );
                        toast.add({ type: "success", title: "Link copied" });
                      }}
                    >
                      <IconCopy /> Copy Link
                    </DropdownMenuItem>
                    {share.password && (
                      <DropdownMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(share.password!);
                          toast.add({
                            type: "success",
                            title: "Password copied",
                          });
                        }}
                      >
                        <IconCopy /> Copy Password
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() =>
                        toast.promise(deleteShare(share.id), {
                          loading: "Deleting share...",
                          success: "Share deleted.",
                          error: "Failed to delete share.",
                        })
                      }
                    >
                      <IconTrash /> Delete Share
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ))}
              <CreateShareForm path={path} />
            </div>
          )}
          <Toaster />
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreateShareForm({ path }: { path: string }) {
  const [hasPassword, setHasPassword] = useState(true);
  const randomPassword = () =>
    Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
  const [password, setPassword] = useState(randomPassword());
  const [note, setNote] = useState("");

  const { client, queries } = useServer();
  const queryClient = useQueryClient();
  const createShare = async () => {
    await client.shares.createShare({
      path,
      note: note.trim().length > 0 ? note : undefined,
      password: hasPassword ? password : null,
    });
    setHasPassword(true);
    setPassword(randomPassword());
    setNote("");
    queryClient.invalidateQueries({
      queryKey: queries.shares.getSharesForPath.key(),
    });
  };

  return (
    <div className="bg-muted rounded-md p-3 flex flex-col gap-3">
      <FieldSet>
        <FieldLegend>
          Create Share: <span className="font-mono">{path}</span>
        </FieldLegend>
      </FieldSet>
      <FieldGroup>
        <Field>
          <FieldLabel className="bg-transparent!">
            <Switch checked={hasPassword} onCheckedChange={setHasPassword} />
            Password
          </FieldLabel>
          <Input
            disabled={!hasPassword}
            type="text"
            value={hasPassword ? password : ""}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Share password..."
          />
        </Field>
        <Field>
          <FieldLabel className="bg-transparent!">
            <Switch />
            Write Access
          </FieldLabel>
        </Field>
        <Field>
          <Input
            type="text"
            placeholder="Optional note..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </FieldGroup>
      <div className="flex justify-end">
        <Button
          onClick={() =>
            toast.promise(createShare(), {
              loading: "Creating share...",
              success: "Share created.",
              error: "Failed to create share.",
            })
          }
        >
          Create Share
        </Button>
      </div>
    </div>
  );
}
