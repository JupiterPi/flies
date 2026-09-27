import { useEffect, useState } from "react";
import { Task, type Goal } from "./schema";
import { FieldGroup } from "#/components/ui/field";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
  NumberFieldScrubArea,
} from "#/components/reui/number-field";
import { cn } from "cn";
import { IconCheckbox } from "@tabler/icons-react";

export function CreateGoal({ setGoal }: { setGoal: (goal: Goal) => void }) {
  const availableGoalTypes: { label: string; value: Goal["goalType"] }[] = [
    { label: "Number Goal", value: "number" },
    { label: "Density Goal", value: "density" },
  ];
  const [goalType, setGoalType] = useState<Goal["goalType"] | null>(null);

  return (
    <>
      <Select
        items={availableGoalTypes}
        value={goalType}
        onValueChange={setGoalType}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Goal Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {availableGoalTypes.map((goalType) => (
              <SelectItem key={goalType.value} value={goalType.value}>
                {goalType.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>

      {goalType === "number" && <CreateNumberGoal setGoal={setGoal} />}
      {goalType === "density" && <CreateDensityGoal setGoal={setGoal} />}
    </>
  );
}

function CreateNumberGoal({ setGoal }: { setGoal: (goal: Goal) => void }) {
  const [targetCompletions, setTargetCompletions] = useState(1);
  useEffect(() => {
    setGoal({
      goalType: "number",
      targetCompletions,
    });
  }, [targetCompletions, setGoal]);

  return (
    <NumberField
      min={1}
      value={targetCompletions}
      onValueChange={(n) => n && setTargetCompletions(n)}
    >
      <NumberFieldScrubArea label="Number of Completions" />
      <NumberFieldGroup>
        <NumberFieldDecrement />
        <NumberFieldInput />
        <NumberFieldIncrement />
      </NumberFieldGroup>
    </NumberField>
  );
}

function CreateDensityGoal({ setGoal }: { setGoal: (goal: Goal) => void }) {
  const [numberOfDays, setNumberOfDays] = useState(7);
  const [targetCompletions, setTargetCompletions] = useState(1);
  useEffect(() => {
    setGoal({
      goalType: "density",
      startAt: Date.now(),
      numberOfDays,
      targetCompletions,
    });
  }, [numberOfDays, targetCompletions, setGoal]);

  return (
    <FieldGroup className="grid grid-cols-2 gap-2">
      <NumberField
        min={1}
        value={targetCompletions}
        onValueChange={(n) => n && setTargetCompletions(n)}
      >
        <NumberFieldScrubArea label="Number of Completions" />
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
      <NumberField
        min={1}
        value={numberOfDays}
        onValueChange={(n) => n && setNumberOfDays(n)}
      >
        <NumberFieldScrubArea label="Per Number of Days" />
        <NumberFieldGroup>
          <NumberFieldDecrement />
          <NumberFieldInput />
          <NumberFieldIncrement />
        </NumberFieldGroup>
      </NumberField>
    </FieldGroup>
  );
}

export function GoalSummary({ task }: { task: Task }) {
  if (task.goal.goalType === "number") {
    const balance = task.completions.length - task.goal.targetCompletions;
    return (
      <div className="flex gap-2 justify-between">
        Number Goal ({task.goal.targetCompletions} completions):{" "}
        <div
          className={cn(
            balance < 0 ? "text-red-500" : "text-green-500",
            "text-xl font-mono font-semibold",
          )}
        >
          {balance !== 0 && balance}
          {balance === 0 && <IconCheckbox />}
        </div>
      </div>
    );
  }
  if (task.goal.goalType === "density") {
    const balance = computeDensityGoalBalance(task);
    return (
      <div className="flex gap-2 justify-between">
        Density ({task.goal.targetCompletions}/{task.goal.numberOfDays}d):{" "}
        <div
          className={cn(
            balance < 0 ? "text-red-500" : "text-green-500",
            "text-xl font-mono font-semibold",
          )}
        >
          {balance.toFixed(1)}
        </div>
      </div>
    );
  }
  // @ts-expect-error
  throw new Error("Unknown goal type: " + task.goal.goalType);
}

export function computeUrgency(task: Task): number {
  if (task.goal.goalType === "number") {
    const balance = task.completions.length - task.goal.targetCompletions;
    return -balance;
  }
  if (task.goal.goalType === "density") {
    const balance = computeDensityGoalBalance(task);
    return -balance;
  }
  // @ts-expect-error
  throw new Error("Unknown goal type: " + task.goal.goalType);
}

function computeDensityGoalBalance(task: Task): number {
  if (task.goal.goalType !== "density") {
    throw new Error("Task does not have a density goal");
  }
  const { startAt, numberOfDays, targetCompletions } = task.goal;
  const now = task.closedAt ?? Date.now();
  const elapsedDays = (now - startAt) / (1000 * 60 * 60 * 24);
  const expectedCompletions = (elapsedDays / numberOfDays) * targetCompletions;
  return task.completions.length - expectedCompletions;
}
