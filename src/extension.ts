import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as child_process from "child_process";
import { promisify } from "util";

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

function showToDoList() {
  let counter = 1;
  let error_messages = "Errors:\n";
  while (toDoList.length > 0) {
    const todoItem = toDoList.shift();
    if (todoItem) {
      if (todoItem.type === "error") {
        vscode.window.showErrorMessage(todoItem?.message!);
        error_messages += counter.toString() + ". " + todoItem?.message! + "\n";
        counter++;
      } else if (todoItem.type === "warning") {
        vscode.window.showWarningMessage(todoItem?.message!);
        error_messages += counter.toString() + ". " + todoItem?.message! + "\n";
        counter++;
      } else {
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

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      console.log("No workspace folder found");
      return "Error: No workspace folder found";
    }

    try {
      const websiteUrl = getWebsiteUrl();
      const timeout = getTimeout();

      console.log(`Running axe-cli analysis on: ${websiteUrl}`);

      const exec = promisify(child_process.exec);

      const axeCliPath = path.join(
        __dirname,
        "..",
        "node_modules",
        ".bin",
        "axe"
      );

      const logsDir = path.join(workspaceFolder.uri.fsPath, "codea11y-logs");
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }

      const axeResultsPath = path.join(logsDir, "axe-results.json");

      const axeCommand = `"${axeCliPath}" "${websiteUrl}" --tags wcag2a,wcag2aa,wcag21aa,best-practice --save "${axeResultsPath}" --verbose`;

      console.log(`Executing: ${axeCommand}`);

      const { stdout, stderr } = await exec(axeCommand, {
        timeout: timeout + 5000, // Give extra time for the command itself
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer for large results
      });

      if (stderr && stderr.trim()) {
        console.warn("Axe-cli stderr:", stderr);
      }

      // Read and parse the JSON results file
      let results: any;
      try {
        if (!fs.existsSync(axeResultsPath)) {
          throw new Error(`Axe results file not found: ${axeResultsPath}`);
        }

        const resultsFileContent = fs.readFileSync(axeResultsPath, "utf-8");
        if (!resultsFileContent.trim()) {
          throw new Error("Axe results file is empty");
        }

        results = JSON.parse(resultsFileContent);
      } catch (parseError) {
        console.error("Failed to read or parse axe-results.json:", parseError);
        throw new Error(`Failed to parse axe-results.json: ${parseError}`);
      }

      // Return the raw JSON results
      const logContent = JSON.stringify(results, null, 2);

      return logContent;
    } catch (error: any) {
      const errorMessage = `Error running axe-cli accessibility check: ${
        error.message || "Unknown error"
      }`;
      console.error(errorMessage);
      console.error("Full error:", error);

      // Show notification for error
      vscode.window.showWarningMessage(
        "⚠️ Axe-cli accessibility check failed: " + error.message
      );

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
