import { openai } from "@ai-sdk/openai";
import { Agent } from "@mastra/core/agent";
import { z } from "zod";
import { Memory } from "@mastra/memory";

// Canvas Agent working memory schema mirrors the front-end AgentState
export const AgentState = z.object({
  // Avoid z.any() to ensure valid JSON schema for OpenAI tools
  // Use a permissive object so the array has a defined 'items' schema
  items: z
    .array(
      z
        .object({ id: z.string().optional() })
        .passthrough()
    )
    .default([]),
  globalTitle: z.string().default(""),
  globalDescription: z.string().default(""),
  lastAction: z.string().default(""),
  itemsCreated: z.number().int().default(0),
  planSteps: z.array(z.object({
    title: z.string(),
    status: z.enum(["pending", "in_progress", "completed", "blocked", "failed"]),
    note: z.string().optional(),
  })).default([]),
  currentStepIndex: z.number().int().default(-1),
  planStatus: z.string().default(""),
});

export const canvasAgent = new Agent({
  name: "sample_agent",
  description: "Canvas agent powering CopilotKit AG-UI interactions.",
  tools: {},
  model: openai("gpt-4o-mini"),
  instructions: [
    "You are a helpful assistant managing a canvas of items. Prefer shared state over chat history.",
    "\n",
    "Planning protocol:",
    "- If the user request is non-trivial (requires multiple steps, dependencies, or ordering), first create a concise plan before executing.",
    "- Write the plan to working memory keys exactly as follows (JSON-like structure):",
    "  planStatus: 'in_progress' | 'completed' | 'failed'",
    "  currentStepIndex: number (0-based; -1 if none)",
    "  planSteps: Array<{ title: string; status: 'pending' | 'in_progress' | 'completed' | 'blocked' | 'failed'; note?: string }>",
    "- Each plan step must include all original user requirements relevant to that step. Be concise but complete; do not omit required details.",
    "- When starting, set planStatus='in_progress', currentStepIndex to the first step index, and set that step's status to 'in_progress'; all later steps 'pending'.",
    "- As you progress, update currentStepIndex and step statuses accordingly; when done, mark all steps 'completed' and planStatus='completed'.",
    "- If execution irrecoverably fails, set planStatus='failed' and the failing step status to 'failed' with a brief note.",
    "- Use client tools named exactly: setPlan, updatePlanProgress, completePlan. Prefer these over any similarly named server tools.",
    "- After marking the plan completed, send a brief confirmation message summarizing the outcome.",
  ].join("\n"),
  memory: new Memory({
    options: {
      workingMemory: {
        enabled: true,
        schema: AgentState,
      },
    },
  }),
});
