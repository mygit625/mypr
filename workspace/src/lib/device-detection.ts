
'use server';

import pce from '@51degrees/pce.js';

// Initialize the 51Degrees pipeline
const pipeline = pce.pce.pipelineBuilder
  .create()
  .add(
    pce.pce.evidenceBuilder.create().addFromRequest(
      pce.pce.requestEvidenceBuilder.create().add("user-agent").build()
    ).build()
  )
  .add(
    pce.pce.engineBuilder.create().build()
  )
  .build();

export async function getDeviceType(userAgent: string): Promise<string> {
  if (!process.env.F51_RESOURCE_KEY) {
    console.error("51Degrees Resource Key (F51_RESOURCE_KEY) is not configured.");
    // Fallback to a very basic detection if the key is missing
    if (/android/i.test(userAgent)) return 'Mobile';
    if (/iphone|ipad|ipod/i.test(userAgent)) return 'Tablet'; // Simplified for fallback
    return 'Desktop';
  }
  
  try {
    const flowData = pipeline.createFlowData();
    flowData.addEvidence({ "header.user-agent": userAgent });
    await flowData.process();

    const deviceType = flowData.get("device")?.getProperty("devicetype")?.getValue()?.asString();

    return deviceType || 'Unknown'; // e.g., 'Desktop', 'Mobile', 'Tablet', etc.
  
  } catch (error) {
    console.error("Error during 51Degrees device detection:", error);
    return 'Unknown'; // Return a safe default on error
  }
}
