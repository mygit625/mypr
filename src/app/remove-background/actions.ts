
"use server";

import {
  removeBackground,
  type RemoveBackgroundInput,
  type RemoveBackgroundOutput,
} from "@/ai/flows/remove-background-flow";

export async function removeBackgroundAction(
  input: RemoveBackgroundInput
): Promise<RemoveBackgroundOutput | { error: string }> {
  try {
    const result = await removeBackground(input);
    return result;
  } catch (error: any) {
    console.error("Error in removeBackgroundAction:", error);
    return {
      error:
        error.message ||
        "An unexpected error occurred while removing the background.",
    };
  }
}
