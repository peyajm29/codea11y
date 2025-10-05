import * as vscode from "vscode";
import { ChatHandler } from "./chatHandler";
import { CodeA11y_PARTICIPANT_ID } from "./constants";

export function activate(context: vscode.ExtensionContext) {
  console.log("Activating CodeA11y extension...");
  
  if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
    console.log("No workspace folder found. Some features may be limited.");
  }

  const chatHandler = new ChatHandler();

  const handler: vscode.ChatRequestHandler = async (
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ) => {
    return await chatHandler.handleChatRequest(request, context, stream, token);
  };

  const CodeA11y = vscode.chat.createChatParticipant(
    CodeA11y_PARTICIPANT_ID,
    handler
  );
  
  CodeA11y.iconPath = vscode.Uri.joinPath(
    context.extensionUri,
    "cute_robot_icon.svg"
  );

  context.subscriptions.push(CodeA11y);
}

export function deactivate() {}