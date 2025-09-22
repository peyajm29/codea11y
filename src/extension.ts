import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
// @ts-ignore
import * as axe from "axe-core";
import { JSDOM } from "jsdom";

const CodeA11y_PARTICIPANT_ID = "chat-sample.CodeA11y";

// Function to get the website URL from VS Code settings
function getWebsiteUrl(): string {
  const config = vscode.workspace.getConfiguration("codea11y");
  return config.get("websiteUrl", "http://127.0.0.1:5500");
}

// Function to get timeout from VS Code settings
function getTimeout(): number {
  const config = vscode.workspace.getConfiguration("codea11y");
  return config.get("timeout", 10000);
}

interface ICodeA11yChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

// Use gpt-4o since it is fast and high quality. gpt-3.5-turbo and gpt-4 are also available.
const MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
  vendor: "copilot",
  family: "gpt-4o",
};

const a11ysystemPrompt = `I am unaware about accessibility and need to write code that conforms with the WCAG 2.1 level A and AA success criteria defined at https://www.w3.org/TR/WCAG21/. 
I want you to be my accessibility coach, a subject-matter expert that makes me think and account for all accessibility requirements and usability enhancements. 
When you answer questions about accessibility please use reputable sources such as w3.org, webaim.org, developer.mozilla.org, and https://www.ibm.com/able/. 
When possible, please provide links and references for additional learning.
When you suggest code please use semantic HTML, ensure it is operable using the keyboard, follow WCAG 2.1 sufficient techniques, and follow the ARIA Authoring Practices Guide and related design patterns.
Do not provide such suggestions if they are not relevant to the code snippet or if they are not needed or if I have not asked for anything.
When giving code snippets, tell exact files and positions where changes should be applied. When dealing with labels and alt text, don't give placeholder variables, but tell me where to give meaningful values. 
If I have given generic request like hi, not related to the code snippet, don't even mention accessibility.
Prioritise my current request and do not provide unsolicited advice. Here is my current request:`;

const logPrompt = `Review the accessibility checker log and provide feedback to fix errors relevant to current chat context. 
Remind me to fix these issues when relevant. Go through the code to provide exact fixes.
Prioritise my current chat context and do not provide unsolicited advice.
Say "Your website has an accessibility error.", tell the error in 1 line and give the existing code that resulted in that error.
Do not repeat information that is already present in the current chat context.
Just give one most relevant error and fix.
If I have given generic request like hi, just say "/n".
Do not provide such feedback if they are not relevant to my current chat context or if they are not needed or if I have not asked for anything.
Just say "/n".`;

const chatContextPrompt = `This is GitHub Copilot's response to a developer request for a code snippet.`;

const toDoExtractPrompt = `Is there a concrete step that the developer needs to complete to comply with accessibility standards after receiving this response?
Give a link to the actual accessibility standard or guideline if possible.
Reminder should be a single line and not more than 8 words plus relevant code from snippet.
For example, remind the developer to replace the placeholder attributes with meaningful values or labels, or visually inspect element for colour contrast when needed.
The reminder should be INFO: <task> or WARNING: <task> or ERROR: <task>. 
Choose the category based on the severity of the reminder. For example, WCAG AA and A compliance reminders should always be given as ERROR, WCAG AAA should be given as WARNING. Reminders not related to WCAG compliance should be given as INFO.
Don't provide links already present in the current chat context.`;

type ToDoType = "info" | "error" | "warning";

interface ToDoItem {
  message: string;
  type: ToDoType;
}
let toDoList: ToDoItem[] = [];

function extractToDos(response: string): void {
  // Define the regular expression to match the patterns
  const regex = /(INFO|ERROR|WARNING): (.*?)(?=(INFO|ERROR|WARNING):|$)/gs;
  let match;

  // Use the regular expression to find all matches
  while ((match = regex.exec(response)) !== null) {
    let type: ToDoType;
    switch (match[1]) {
      case "INFO":
        type = "info";
        break;
      case "ERROR":
        type = "error";
        break;
      case "WARNING":
        type = "warning";
        break;
      default:
        type = "error"; // Default type if none is specified
    }
    const toDoItem: ToDoItem = {
      message: match[2].trim(),
      type: type,
    };
    toDoList.push(toDoItem);
  }
}

// display developer reminders / to-dos
function showToDoList() {
  let counter = 1;
  // list of error messages
  let error_messages = "Errors:\n";
  while (toDoList.length > 0) {
    const todoItem = toDoList.shift();
    if (todoItem) {
      if (todoItem.type === "error") {
        vscode.window.showErrorMessage(todoItem?.message!);
        // vscode.window.showErrorMessage(todoItem?.message!, { modal: true });
        error_messages += counter.toString() + ". " + todoItem?.message! + "\n";
        counter++;
      } else if (todoItem.type === "warning") {
        vscode.window.showWarningMessage(todoItem?.message!);
        // vscode.window.showWarningMessage(todoItem?.message!, { modal: true });
        error_messages += counter.toString() + ". " + todoItem?.message! + "\n";
        counter++;
      } else {
        // vscode.window.showInformationMessage(todoItem?.message!, { modal: true });
        vscode.window.showInformationMessage(todoItem?.message!);
        error_messages += counter.toString() + ". " + todoItem?.message! + "\n";
        counter++;
      }
    }
  }
  return;
}

// Get the accessibility log context
async function getAccessibilityLogContext(): Promise<string> {
  try {
    // Ensure we have a workspace folder
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      console.log("No workspace folder found");
      return "Error: No workspace folder found";
    }

    try {
      // Get the website URL from configuration
      const websiteUrl = getWebsiteUrl();
      const timeout = getTimeout();

      // Fetch the HTML content from the live URL with better error handling
      const response = await axios.get(websiteUrl, {
        timeout: timeout,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CodeA11y-Accessibility-Checker/1.0)",
        },
      });
      const html = response.data;

      // Validate that we got HTML content
      if (!html || typeof html !== "string") {
        throw new Error("Invalid HTML content received from URL");
      }

      // Create a virtual DOM using jsdom with enhanced configuration for SPA frameworks
      const dom = new JSDOM(html, {
        url: websiteUrl,
        pretendToBeVisual: true,
        resources: "usable",
        runScripts: "outside-only", // Allow external scripts but not inline scripts for security
        beforeParse(window) {
          // Add common global objects that frameworks might expect
          window.fetch =
            global.fetch ||
            (() => Promise.reject(new Error("Fetch not available")));
        },
      });

      // Get window and document from JSDOM
      const { window } = dom;
      const { document } = window;

      // Validate that we have a proper document
      if (!document || !document.documentElement) {
        throw new Error("Failed to create valid DOM from HTML content");
      }

      console.log(
        `DOM created successfully. Document has ${
          document.querySelectorAll("*").length
        } elements`
      );
      console.log(`Title: "${document.title}"`);
      console.log(`Body exists: ${!!document.body}`);

      // Configure axe-core with the JSDOM context
      let results: any;

      // Store original globals to restore later
      const originalWindow = (global as any).window;
      const originalDocument = (global as any).document;

      try {
        // Set global window and document for axe-core
        (global as any).window = window;
        (global as any).document = document;

        // Also ensure axe can access these through the window object
        window.axe = axe;

        // Initialize axe-core with the current context
        axe.configure({
          // Ensure axe-core uses the correct document context
        });

        console.log("Axe-core configured, running analysis...");

        // Run axe-core analysis - try multiple methods for maximum compatibility
        try {
          // Method 1: Run with explicit document context
          console.log("Trying Method 1: Document context");
          results = await axe.run(document, {
            // Configure axe-core options for comprehensive checking
            runOnly: {
              type: "tag",
              values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
            },
          });
          console.log("Method 1 succeeded");
        } catch (contextError) {
          const errorMessage =
            contextError instanceof Error
              ? contextError.message
              : "Unknown error";
          console.log(
            "Direct context method failed, trying alternative approach:",
            errorMessage
          );

          // Method 2: Run without explicit context (using globals)
          try {
            console.log("Trying Method 2: Global context");
            results = await axe.run({
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
              },
            });
            console.log("Method 2 succeeded");
          } catch (globalError) {
            const globalErrorMessage =
              globalError instanceof Error
                ? globalError.message
                : "Unknown error";
            console.log(
              "Global method failed, trying root element approach:",
              globalErrorMessage
            );

            // Method 3: Run with document.documentElement as context
            console.log("Trying Method 3: Root element context");
            results = await axe.run(document.documentElement, {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa", "best-practice"],
              },
            });
            console.log("Method 3 succeeded");
          }
        }
      } finally {
        // Always restore original globals
        if (originalWindow !== undefined) {
          (global as any).window = originalWindow;
        } else {
          delete (global as any).window;
        }
        if (originalDocument !== undefined) {
          (global as any).document = originalDocument;
        } else {
          delete (global as any).document;
        }
      }

      // Format the results as a string with metadata
      const logHeader = `CodeA11y Accessibility Analysis Report
Generated: ${new Date().toISOString()}
URL: ${websiteUrl}
Total Violations: ${results.violations.length}
Total Passes: ${results.passes.length}
Total Incomplete: ${results.incomplete.length}
Total Inapplicable: ${results.inapplicable.length}
Axe Version: ${results.testEngine?.version || "Unknown"}

========================================
VIOLATIONS:
========================================

`;

      const violations = results.violations
        .map((violation: any, index: number) => {
          return `${index + 1}. ${violation.help}
   Impact: ${violation.impact}
   Description: ${violation.description}
   Help URL: ${violation.helpUrl}
   Elements Affected: ${violation.nodes.length}
   Elements: ${violation.nodes.map((node: any) => node.html).join(", ")}
   
`;
        })
        .join("");

      const logContent =
        logHeader + (violations || "No accessibility violations found");

      // Create logs directory if it doesn't exist
      const logsDir = path.join(workspaceFolder.uri.fsPath, "logs");
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      // Use fixed filename - will replace existing file
      const logPath = path.join(logsDir, "accessibility.log");
      fs.writeFileSync(logPath, logContent, "utf-8");
      console.log("Accessibility log updated at:", logPath);

      // Show a notification to the user
      vscode.window.showInformationMessage(
        "📝 Accessibility log updated: accessibility.log"
      );

      return logContent;
    } catch (error: any) {
      const errorMessage = `Error running accessibility check: ${
        error.message || "Unknown error"
      }`;
      console.error(errorMessage);

      // Try to write error to log file
      try {
        const logsDir = path.join(workspaceFolder.uri.fsPath, "logs");
        if (!fs.existsSync(logsDir)) {
          fs.mkdirSync(logsDir, { recursive: true });
        }
        // Use fixed filename for error log - will replace existing file
        const logPath = path.join(logsDir, "accessibility-error.log");
        fs.writeFileSync(logPath, errorMessage, "utf-8");
        console.log("Error log updated at:", logPath);

        // Show notification for error log
        vscode.window.showWarningMessage(
          "⚠️ Accessibility check error logged: accessibility-error.log"
        );
      } catch (writeError) {
        console.error("Failed to write error log:", writeError);
      }

      return errorMessage;
    }
  } catch (error: any) {
    console.error("Critical error:", error);
    return "Critical error occurred: " + (error.message || "Unknown error");
  }
}

async function getRelevantContext(): Promise<string> {
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  if (!workspaceFolder) {
    return "";
  }

  const readmePath = path.join(workspaceFolder.uri.fsPath, "README.md");
  if (!fs.existsSync(readmePath)) {
    return "";
  }

  try {
    const fileContent = fs.readFileSync(readmePath, "utf-8");
    return fileContent;
  } catch (error) {
    console.error("Error reading README.md:", error);
    return "";
  }
}

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating CodeA11y extension...");

  // Ensure we have a workspace
  if (
    !vscode.workspace.workspaceFolders ||
    vscode.workspace.workspaceFolders.length === 0
  ) {
    console.log("No workspace folder found. Some features may be limited.");
  } else {
    console.log(
      "Workspace folder:",
      vscode.workspace.workspaceFolders[0].uri.fsPath
    );
  }

  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<ICodeA11yChatResult> => {
    try {
      const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
      if (model) {
        // part 1 of the chat
        let active_file_context = "";
        const textEditor = vscode.window.activeTextEditor;
        if (textEditor) {
          const document = textEditor.document;
          // active_file_context = document.getText();
          const currentLineNumber = textEditor.selection.active.line;
          // select context around the current line
          const startLine = Math.max(0, currentLineNumber - 50);
          const endLine = Math.min(
            document.lineCount - 1,
            currentLineNumber + 50
          );
          active_file_context = document.getText(
            new vscode.Range(
              startLine,
              0,
              endLine,
              document.lineAt(endLine).text.length
            )
          );
          if (active_file_context.length > 3000) {
            active_file_context = active_file_context.substring(0, 3000);
          }
        }

        const messages = [
          vscode.LanguageModelChatMessage.User(await getRelevantContext()),
          vscode.LanguageModelChatMessage.User(active_file_context),
          vscode.LanguageModelChatMessage.User(a11ysystemPrompt),
          vscode.LanguageModelChatMessage.User(request.prompt),
        ];

        const chatResponse1 = await model.sendRequest(messages, {}, token);
        let chatContext = "";
        for await (const fragment of chatResponse1.text) {
          stream.markdown(fragment);
          chatContext += fragment;
        }
        stream.markdown("\n");

        // Generate new accessibility log and get results
        console.log("Generating new accessibility log...");
        stream.markdown(
          "🔍 *Analyzing your website for accessibility issues...*\n\n"
        );
        const accessibilityLogContext = await getAccessibilityLogContext();

        // part 2 of the chat
        const a11yerrormessages = [
          vscode.LanguageModelChatMessage.User(chatContextPrompt),
          vscode.LanguageModelChatMessage.User(chatContext),
          vscode.LanguageModelChatMessage.User(logPrompt),
          vscode.LanguageModelChatMessage.User(accessibilityLogContext),
        ];
        const chatResponse2 = await model.sendRequest(
          a11yerrormessages,
          {},
          token
        );
        stream.markdown("\n");
        for await (const fragment of chatResponse2.text) {
          stream.markdown(fragment);
        }

        // part 3 of the chat
        const toDomessages = [
          vscode.LanguageModelChatMessage.User(chatContextPrompt),
          vscode.LanguageModelChatMessage.User(chatContext),
          vscode.LanguageModelChatMessage.User(toDoExtractPrompt),
        ];
        const chatResponse3 = await model.sendRequest(toDomessages, {}, token);
        let response = "";
        stream.markdown("\n");
        for await (const fragment of chatResponse3.text) {
          response += fragment;
        }
        extractToDos(response);
        showToDoList();
      }
    } catch (err) {
      handleError(logger, err, stream);
    }

    logger.logUsage("request", { kind: "" });
    return { metadata: { command: "" } };
  };

  // Chat participants appear as top-level options in the chat input
  // when you type `@`, and can contribute sub-commands in the chat input
  // that appear when you type `/`.
  const CodeA11y = vscode.chat.createChatParticipant(
    CodeA11y_PARTICIPANT_ID,
    handler
  );
  CodeA11y.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    "cute_robot_icon.svg"
  );

  const logger = vscode.env.createTelemetryLogger({
    sendEventData(eventName, data) {
      // Capture event telemetry
      console.log(`Event: ${eventName}`);
      console.log(`Data: ${JSON.stringify(data)}`);
    },
    sendErrorData(error, data) {
      // Capture error telemetry
      console.error(`Error: ${error}`);
      console.error(`Data: ${JSON.stringify(data)}`);
    },
  });

  context.subscriptions.push(
    CodeA11y.onDidReceiveFeedback((feedback: vscode.ChatResultFeedback) => {
      // Log chat result feedback to be able to compute the success matric of the participant
      // unhelpful / totalRequests is a good success metric
      logger.logUsage("chatResultFeedback", {
        kind: feedback.kind,
      });
    })
  );

  context.subscriptions.push(CodeA11y);
}

function handleError(
  logger: vscode.TelemetryLogger,
  err: any,
  stream: vscode.ChatResponseStream
): void {
  // making the chat request might fail because
  // - model does not exist
  // - user consent not given
  // - quote limits exceeded
  logger.logError(err);

  if (err instanceof vscode.LanguageModelError) {
    console.log(err.message, err.code, err.cause);
    if (err.cause instanceof Error && err.cause.message.includes("off_topic")) {
      stream.markdown(vscode.l10n.t(""));
    }
  } else {
    // re-throw other errors so they show up in the UI
    throw err;
  }
}

export function deactivate() {}
