#!/usr/bin/env node
import type { PathLike } from "node:fs";
import { promises as fs } from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function toCamelCase(input: string) {
  const cleaned = input
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, " ")
    .trim();

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (!words.length) return "";

  const [first, ...rest] = words;
  return first + rest.map((w) => w[0].toUpperCase() + w.slice(1)).join("");
}

async function updateToolsIndex(
  toolsIndexPath: PathLike | fs.FileHandle,
  toolName: string,
) {
  let contents: string;
  try {
    contents = await fs.readFile(toolsIndexPath, "utf8");
  } catch (error) {
    throw new Error(
      `Could not read the tools index file at ${toolsIndexPath}. ` +
        `Ensure it exists and try again.\n${error}`,
    );
  }

  const importLine = `import { ${toolName}Tool } from "./${toolName}";\n`;
  const newEntry = `{
      ...${toolName}Tool,
      // biome-ignore lint/suspicious/noExplicitAny: All tools validate their input schemas, so any is fine.
      handler: (args: any) => ${toolName}Tool.handler(args),
    },`;

  const lines = contents.split("\n");

  let lastImportIndex = -1;
  lines.forEach((line, idx) => {
    if (/^\s*import\s.+?\sfrom\s+["'].+["'];?$/.test(line.trim())) {
      lastImportIndex = idx;
    }
  });

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }

  const returnStartRegex = /return\s*\[\s*/;
  const returnEndRegex = /\]\s*;/;

  let arrayStartIndex = -1;
  let arrayEndIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (returnStartRegex.test(lines[i])) {
      arrayStartIndex = i;
    }
    if (arrayStartIndex !== -1 && returnEndRegex.test(lines[i])) {
      arrayEndIndex = i;
      break;
    }
  }

  if (arrayStartIndex === -1 || arrayEndIndex === -1) {
    throw new Error(
      `Could not locate 'return [ ... ];' in createTools() function. ` +
        "Please ensure the file structure matches the expected pattern.",
    );
  }

  lines.splice(arrayEndIndex, 0, `    ${newEntry}`);

  const updatedContents = lines.join("\n");
  await fs.writeFile(toolsIndexPath, updatedContents, "utf8");
}

async function main() {
  try {
    const toolName = await new Promise<string>((resolve) => {
      rl.question("Enter the name of the new tool: ", (userInput) => {
        const camel = toCamelCase(userInput);
        resolve(camel);
      });
    });

    if (!toolName) {
      throw new Error("Tool name cannot be empty");
    }

    if (!/^[a-z][a-zA-Z0-9]*$/.test(toolName)) {
      throw new Error("Tool name must be a valid lowerCamelCase identifier");
    }

    const capitalToolName = toolName[0].toUpperCase() + toolName.slice(1);

    console.log(`\nWe are about to create a new tool named "${toolName}" at:`);
    console.log(
      `  src/tools/${toolName}/index.ts, schema.ts, ${toolName}.test.ts`,
    );
    console.log(
      `\nOptionally, we can add "${toolName}" to "src/tools/index.ts" for you.`,
    );

    const confirmUpdate = await new Promise<string>((resolve) => {
      rl.question(
        `Do you want to automatically add "${toolName}" to tools index? (y/N) `,
        (ans) => {
          resolve(ans.trim().toLowerCase());
        },
      );
    });

    const toolDir = path.join(__dirname, "src", "tools", toolName);
    await fs.mkdir(toolDir, { recursive: true });

    const indexContent = `import type { ToolRegistration } from "@/types";
import { makeJsonSchema } from "@/utils/makeJsonSchema";
import { type ${capitalToolName}Schema, ${toolName}Schema } from "./schema";

export const ${toolName} = (args: ${capitalToolName}Schema): string => {
  try {
    // Basic placeholder: produce a string using 'name' from the schema
    return \`Hello \${args.name}\`;
  } catch (error) {
    console.error("Error in ${toolName}:", error);
    throw new Error(\`Failed to process input: \${(error as Error).message}\`);
  }
};

export const ${toolName}Tool: ToolRegistration<${capitalToolName}Schema> = {
  name: "${toolName.replace(/([A-Z])/g, "_$1").toLowerCase()}",
  description: "A generic tool example",
  inputSchema: makeJsonSchema(${toolName}Schema),
  handler: (args: ${capitalToolName}Schema) => {
    try {
      const parsedArgs = ${toolName}Schema.parse(args);
      const result = ${toolName}(parsedArgs);
      return {
        content: [
          {
            type: "text",
            text: result,
          },
        ],
      };
    } catch (error) {
      console.error("Error in ${toolName}Tool handler:", error);
      return {
        content: [
          {
            type: "text",
            text: \`Error: \${(error as Error).message}\`,
          },
        ],
        isError: true,
      };
    }
  },
};
`;
    await fs.writeFile(path.join(toolDir, "index.ts"), indexContent);
    const schemaContent = `import { z } from "zod";

export const ${toolName}Schema = z.object({
  name: z.string().min(1, "Name is required"),
  // Add more fields as needed
});

export type ${capitalToolName}Schema = z.infer<typeof ${toolName}Schema>;
`;
    await fs.writeFile(path.join(toolDir, "schema.ts"), schemaContent);

    const testContent = `import { describe, expect, it } from "bun:test";
import { ${toolName}Schema } from "./schema";
import { ${toolName} } from "./index";

describe("${toolName} Tool", () => {
  it("should parse valid input", () => {
    const result = ${toolName}Schema.safeParse({ name: "John" });
    expect(result.success).toBe(true);
  });

  it("should handle the main function", () => {
    const output = ${toolName}({ name: "John" });
    expect(output).toBe("Hello John");
  });
});
`;
    await fs.writeFile(path.join(toolDir, `${toolName}.test.ts`), testContent);

    if (confirmUpdate === "y" || confirmUpdate === "yes") {
      const toolsIndexPath = path.join(__dirname, "src", "tools", "index.ts");
      await updateToolsIndex(toolsIndexPath, toolName);
      console.log(
        `\nSuccessfully created new tool "${toolName}" and updated src/tools/index.ts.\n`,
      );
    } else {
      console.log(`\nSuccessfully created new tool "${toolName}".\n`);
      console.log("(Skipping automatic update of src/tools/index.ts.)\n");
    }
  } catch (error) {
    console.error("Error creating tool:", error);
  } finally {
    rl.close();
  }
}

main();
