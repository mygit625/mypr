
"use client";

export function downloadDataUri(dataUri: string, filename: string): void {
  try {
    const link = document.createElement('a');
    link.href = dataUri;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    link.remove(); // More robust cleanup
  } catch (error) {
    console.error("Error triggering download:", error);
    // Fallback or user notification can be added here
    alert("Could not initiate download. Please try again or check console for errors.");
  }
}
