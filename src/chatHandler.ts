import * as vscode from "vscode";
import { ICodeA11yChatResult } from "./types";
import { MODEL_SELECTOR, A11Y_SYSTEM_PROMPT, LOG_PROMPT, CHAT_CONTEXT_PROMPT, TODO_EXTRACT_PROMPT } from "./constants";
import { AccessibilityAnalyzer } from "./accessibilityAnalyzer";
import { TodoManager } from "./todoManager";
import { getRelevantContext } from "./utils";

export class ChatHandler {
  private accessibilityAnalyzer: AccessibilityAnalyzer;
  private todoManager: TodoManager;

  constructor() {
    this.accessibilityAnalyzer = new AccessibilityAnalyzer();
    this.todoManager = new TodoManager();
  }

  /**
   * Gets the active file context around the current cursor position
   */
  private getActiveFileContext(): string {
    let active_file_context = "";
    const textEditor = vscode.window.activeTextEditor;
    
    if (textEditor) {
      const document = textEditor.document;
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
    
    return active_file_context;
  }

  /**
   * Handles error cases during chat processing
   */
  private handleError(
    err: any,
    stream: vscode.ChatResponseStream
  ): void {
    // making the chat request might fail because
    // - model does not exist
    // - user consent not given
    // - quote limits exceeded
    console.error("Chat request error:", err);

    if (err instanceof vscode.LanguageModelError) {
      console.log(err.message, err.code, err.cause);
      if (err.cause instanceof Error && err.cause.message.includes("off_topic")) {
        stream.markdown(vscode.l10n.t("Sorry, I can only help with accessibility-related questions."));
      }
    } else {
      // re-throw other errors so they show up in the UI
      throw err;
    }
  }

  /**
   * Main chat request handler
   */
  public async handleChatRequest(
    request: vscode.ChatRequest,
    context: vscode.ChatContext,
    stream: vscode.ChatResponseStream,
    token: vscode.CancellationToken
  ): Promise<ICodeA11yChatResult> {
    try {
      const [model] = await vscode.lm.selectChatModels(MODEL_SELECTOR);
      if (model) {
        // Part 1 of the chat - Initial accessibility advice
        const active_file_context = this.getActiveFileContext();
        const relevantContext = await getRelevantContext();

        const messages = [
          vscode.LanguageModelChatMessage.User(relevantContext),
          vscode.LanguageModelChatMessage.User(active_file_context),
          vscode.LanguageModelChatMessage.User(A11Y_SYSTEM_PROMPT),
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
          "\n 🔍 *Analyzing your website for accessibility issues...*\n\n"
        );
        const accessibilityLogContext = await this.accessibilityAnalyzer.getAccessibilityLogContext();

        // Part 2 of the chat - Accessibility error analysis
        const a11yerrormessages = [
          vscode.LanguageModelChatMessage.User(CHAT_CONTEXT_PROMPT),
          vscode.LanguageModelChatMessage.User(chatContext),
          vscode.LanguageModelChatMessage.User(LOG_PROMPT),
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

        // Part 3 of the chat - TODO extraction
        const toDomessages = [
          vscode.LanguageModelChatMessage.User(CHAT_CONTEXT_PROMPT),
          vscode.LanguageModelChatMessage.User(chatContext),
          vscode.LanguageModelChatMessage.User(TODO_EXTRACT_PROMPT),
        ];
        const chatResponse3 = await model.sendRequest(toDomessages, {}, token);
        let response = "";
        stream.markdown("\n");
        for await (const fragment of chatResponse3.text) {
          response += fragment;
        }
        this.todoManager.extractToDos(response);
        this.todoManager.showToDoList();
      }
    } catch (err) {
      this.handleError(err, stream);
    }

    return { metadata: { command: "" } };
  }
}