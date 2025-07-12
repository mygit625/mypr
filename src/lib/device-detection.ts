
'use server';

import pce from '@51degrees/pce.js';

// This function needs to be memoized or initialized only once.
// We'll use a simple approach here for demonstration.
let pipeline: any;

function getPipeline() {
  if (pipeline) {
    return pipeline;
  }
  if (!process.env.F51_RESOURCE_KEY) {
    throw new Error("51Degrees Resource Key (F51_RESOURCE_KEY) is not configured in .env file.");
  }
  
  pipeline = pce.pce.pipelineBuilder
    .create()
    .add(
      pce.pce.evidenceBuilder.create().addFromRequest(
        pce.pce.requestEvidenceBuilder.create().add("user-agent").build()
      ).build()
    )
    .add(
      pce.pce.engineBuilder.create().setResourceKey(process.env.F51_RESOURCE_KEY).build()
    )
    .build();
  
  return pipeline;
}

export async function getDeviceType(userAgent: string): Promise<string> {
  try {
    const p = getPipeline();
    const flowData = p.createFlowData();
    flowData.addEvidence({ "header.user-agent": userAgent });
    await flowData.process();

    const deviceType = flowData.get("device")?.getProperty("devicetype")?.getValue()?.asString();

    return deviceType || 'Unknown'; // e.g., 'Desktop', 'Mobile', 'Tablet'
  
  } catch (error) {
    console.error("Error during 51Degrees device detection:", error);
    // Fallback to basic sniffing on error
    const ua = userAgent.toLowerCase();
    if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) return 'Tablet';
    if (/iphone|ipod|android.*mobile|windows phone|iemobile|mobile/.test(ua)) return 'Mobile';
    return 'Desktop';
  }
}
