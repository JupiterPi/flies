import z from "zod";
import { createOperations } from "../operations";
import { produce } from "immer";

// data schema

export const NumberGoal = z.object({
  goalType: z.literal("number"),
  targetCompletions: z.number().int().min(1),
});
export type NumberGoal = z.infer<typeof NumberGoal>;

export const DensityGoal = z.object({
  goalType: z.literal("density"),
  startAt: z.number(),
  numberOfDays: z.number().int().min(1),
  targetCompletions: z.number().int().min(1),
});
export type DensityGoal = z.infer<typeof DensityGoal>;

export const Goal = z.union([NumberGoal, DensityGoal]);
export type Goal = z.infer<typeof Goal>;

export const TaskCompletion = z.object({
  completedAt: z.number(),
  note: z.string().optional(),
});
export type TaskCompletion = z.infer<typeof TaskCompletion>;

export const Task = z.object({
  id: z.string().default(() => crypto.randomUUID()),
  title: z.string(),
  goal: Goal,
  completions: z.array(TaskCompletion).default([]),
  closedAt: z.number().optional(),
});
export type Task = z.infer<typeof Task>;

export const AbhakenData = z.object({
  _: z.literal("https://github.com/JupiterPi/flies Abhaken data v1"),
  tasks: z.array(Task).default([]),
});
export type AbhakenData = z.infer<typeof AbhakenData>;

// operations

export const operations = createOperations<AbhakenData>()({
  createTask: {
    input: z.object({
      title: z.string(),
      goal: Goal,
    }),
    handler: (data, input) =>
      produce(data, (data) => {
        data.tasks.push(
          Task.parse({
            title: input.title,
            goal: input.goal,
          } satisfies z.input<Task>),
        );
      }),
  },
  completeTask: {
    input: z.object({
      taskId: z.string(),
      timestamp: z.number(),
      note: z.string().optional(),
    }),
    handler: (data, input) =>
      produce(data, (data) => {
        const task = data.tasks.find((task) => task.id === input.taskId);
        if (!task) return;
        task.completions.push(
          TaskCompletion.parse({
            completedAt: input.timestamp,
            note: input.note,
          } satisfies z.input<TaskCompletion>),
        );
      }),
  },
  removeCompletion: {
    input: z.object({
      taskId: z.string(),
      completedAt: z.number(),
    }),
    handler: (data, input) =>
      produce(data, (data) => {
        const task = data.tasks.find((task) => task.id === input.taskId);
        if (!task) return;
        task.completions = task.completions.filter(
          (completion) => completion.completedAt !== input.completedAt,
        );
      }),
  },
  closeTask: {
    input: z.object({
      taskId: z.string(),
      timestamp: z.number(),
    }),
    handler: (data, input) =>
      produce(data, (data) => {
        const task = data.tasks.find((task) => task.id === input.taskId);
        if (!task) return;
        task.closedAt = input.timestamp;
      }),
  },
});
