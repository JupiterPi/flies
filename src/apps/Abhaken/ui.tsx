import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { IconCheck, IconPlus, IconTrashX } from "@tabler/icons-react";
import { useAbhakenData } from "./app";
import type { Goal, Task } from "./schema";
import { formatTimestampRelative } from "#/utils";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "#/components/ui/dialog";
import { useState } from "react";
import { Input } from "#/components/ui/input";
import { Field, FieldLabel } from "#/components/ui/field";
import { computeUrgency, CreateGoal, GoalSummary } from "./goals";
import { ScrollArea } from "#/components/ui/scroll-area";

export function AbhakenUI() {
  return <TasksList />;
}

function TasksList() {
  const { data, readonly } = useAbhakenData();
  const activeTasks = data.tasks
    .filter((task) => !task.closedAt)
    .sort((a, b) => computeUrgency(b) - computeUrgency(a)); // sort by urgency descending
  const closedTasks = data.tasks
    .filter((task) => task.closedAt)
    .sort((a, b) => b.closedAt! - a.closedAt!); // sort by closedAt descending

  return (
    <div className="typeset mt-4">
      <h1>Tasks</h1>
      <div className="flex flex-col gap-4">
        {activeTasks.map((task) => (
          <div
            key={task.id}
            className="flex gap-2 justify-stretch items-stretch"
          >
            <div className="flex-1">
              <TaskCard task={task} />
            </div>
            {!readonly && (
              <div className="flex flex-col">
                <TaskCompletionButton task={task} />
              </div>
            )}
          </div>
        ))}
        {activeTasks.length === 0 && (
          <div className="text-muted-foreground italic">No tasks yet.</div>
        )}
        {!readonly && (
          <div>
            <CreateTask />
          </div>
        )}
      </div>

      {closedTasks.length > 0 && (
        <>
          <h2>Closed Tasks</h2>
          <div className="flex flex-col gap-4 mt-4">
            {closedTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function CreateTask() {
  const { dispatchOperation } = useAbhakenData();

  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState<Goal | null>(null);
  const mayCreate = title.length > 0 && goal !== null;

  const createTask =
    dispatchOperation &&
    (() => {
      if (!mayCreate) return;
      dispatchOperation("createTask", {
        title,
        goal,
      });
    });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button>
            <IconPlus />
            Create Task
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Task</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel>Title</FieldLabel>
          <Input
            placeholder="Take out the trash"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            type="text"
          />
        </Field>

        <CreateGoal setGoal={setGoal} />

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          {createTask && (
            <DialogClose
              render={
                <Button disabled={!mayCreate} onClick={createTask}>
                  Save
                </Button>
              }
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskCard({ task }: { task: Task }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  return (
    <>
      <Card
        size="sm"
        className="[--card-spacing:--spacing(4)] cursor-pointer"
        onClick={() => setDetailsOpen(true)}
      >
        <CardHeader>
          <CardTitle>{task.title}</CardTitle>
          {task.closedAt && (
            <CardDescription>
              Closed {formatTimestampRelative(task.closedAt)}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-md p-2 px-3 gap-2 items-center justify-center">
            <GoalSummary task={task} />
          </div>
        </CardContent>
      </Card>
      <TaskDetailsDialog
        task={task}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
      />
    </>
  );
}

function TaskCompletionButton({ task }: { task: Task }) {
  const { dispatchOperation } = useAbhakenData();
  const [noteInput, setNoteInput] = useState("");
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button className="flex-1 min-w-[80px] rounded-xl ring-1 ring-foreground/10 ring-primary hover:ring-green-500/70">
            <IconCheck />
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete Task "{task.title}"</DialogTitle>
        </DialogHeader>

        <Field>
          <FieldLabel>Note (optional)</FieldLabel>
          <Input
            placeholder="Add a note..."
            value={noteInput}
            onChange={(e) => setNoteInput(e.target.value)}
          />
        </Field>

        <DialogFooter>
          <DialogClose render={<Button variant="outline">Cancel</Button>} />
          {dispatchOperation && (
            <DialogClose
              render={
                <Button
                  onClick={() => {
                    dispatchOperation("completeTask", {
                      taskId: task.id,
                      timestamp: Date.now(),
                      note:
                        noteInput.trim().length > 0
                          ? noteInput.trim()
                          : undefined,
                    });
                  }}
                >
                  Complete Task
                </Button>
              }
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDetailsDialog({
  task,
  open,
  onOpenChange,
}: {
  task: Task;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { dispatchOperation } = useAbhakenData();
  const isClosed = task.closedAt !== undefined;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="typeset">
        <DialogHeader>
          {task.title}
          {isClosed && (
            <span className="text-muted-foreground text-sm">
              Closed {formatTimestampRelative(task.closedAt!)}
            </span>
          )}
        </DialogHeader>

        <div className="bg-muted rounded-md p-2 px-3 gap-2 items-center justify-center">
          <GoalSummary task={task} />
        </div>

        <div>
          <h3 className="m-0!">Completions</h3>
          <ScrollArea className="h-40">
            {task.completions.toReversed().map((completion) => (
              <div
                key={completion.completedAt}
                className="text-sm bg-muted rounded-lg py-2 px-3 flex justify-between items-center mb-2"
              >
                <div>
                  {formatTimestampRelative(completion.completedAt)}
                  {completion.note && (
                    <>
                      <br />
                      <span className="text-muted-foreground">
                        {completion.note}
                      </span>
                    </>
                  )}
                </div>
                {!isClosed && dispatchOperation && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => {
                      dispatchOperation("removeCompletion", {
                        taskId: task.id,
                        completedAt: completion.completedAt,
                      });
                    }}
                  >
                    <IconTrashX />
                  </Button>
                )}
              </div>
            ))}
            {task.completions.length === 0 && (
              <div className="text-muted-foreground italic">
                No completions yet.
              </div>
            )}
          </ScrollArea>
        </div>

        <DialogFooter>
          {!isClosed && dispatchOperation && (
            <DialogClose
              render={
                <Button
                  variant="destructive"
                  onClick={() => {
                    dispatchOperation("closeTask", {
                      taskId: task.id,
                      timestamp: Date.now(),
                    });
                  }}
                >
                  Close Task
                </Button>
              }
            />
          )}
          <DialogClose render={<Button variant="outline">Close</Button>} />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
