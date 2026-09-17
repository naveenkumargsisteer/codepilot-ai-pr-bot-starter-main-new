import { generateGeminiResponse } from "./lib/gemini";

async function run() {
  try {
    const res = await generateGeminiResponse("Change this text from 'Turn More Leads' to 'Turn Must Leads'");
    console.log("Success:", res.substring(0, 50));
  } catch (e: any) {
    console.error("Test Error:", e);
  }
}

run();
