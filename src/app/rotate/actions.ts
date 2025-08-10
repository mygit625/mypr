'use server';

// This server action file has been updated to align with the new, more flexible
// page organization functionality. The core logic for assembling pages with
// specific rotations is already available in the organize/actions.ts file,
// so we will re-use that to avoid code duplication and ensure consistency.

// Re-exporting the necessary action from the 'organize' module.
export { assembleIndividualPagesAction } from '../organize/actions';
