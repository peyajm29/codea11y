"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatHandler = void 0;
const vscode = __importStar(require("vscode"));
const constants_1 = require("./constants");
const accessibilityAnalyzer_1 = require("./accessibilityAnalyzer");
const todoManager_1 = require("./todoManager");
const utils_1 = require("./utils");
class ChatHandler {
    accessibilityAnalyzer;
    todoManager;
    constructor() {
        this.accessibilityAnalyzer = new accessibilityAnalyzer_1.AccessibilityAnalyzer();
        this.todoManager = new todoManager_1.TodoManager();
    }
    /**
     * Gets the active file context around the current cursor position
     */
    getActiveFileContext() {
        let active_file_context = "";
        const textEditor = vscode.window.activeTextEditor;
        if (textEditor) {
            const document = textEditor.document;
            const currentLineNumber = textEditor.selection.active.line;
            // select context around the current line
            const startLine = Math.max(0, currentLineNumber - 50);
            const endLine = Math.min(document.lineCount - 1, currentLineNumber + 50);
            active_file_context = document.getText(new vscode.Range(startLine, 0, endLine, document.lineAt(endLine).text.length));
            if (active_file_context.length > 3000) {
                active_file_context = active_file_context.substring(0, 3000);
            }
        }
        return active_file_context;
    }
    /**
     * Handles error cases during chat processing
     */
    handleError(err, stream) {
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
        }
        else {
            // re-throw other errors so they show up in the UI
            throw err;
        }
    }
    /**
     * Main chat request handler
     */
    async handleChatRequest(request, context, stream, token) {
        try {
            const [model] = await vscode.lm.selectChatModels(constants_1.MODEL_SELECTOR);
            if (model) {
                // Part 1 of the chat - Initial accessibility advice
                const active_file_context = this.getActiveFileContext();
                const relevantContext = await (0, utils_1.getRelevantContext)();
                const messages = [
                    vscode.LanguageModelChatMessage.User(relevantContext),
                    vscode.LanguageModelChatMessage.User(active_file_context),
                    vscode.LanguageModelChatMessage.User(constants_1.A11Y_SYSTEM_PROMPT),
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
                stream.markdown("\n 🔍 *Analyzing your website for accessibility issues...*\n\n");
                const accessibilityLogContext = await this.accessibilityAnalyzer.getAccessibilityLogContext();
                // Part 2 of the chat - Accessibility error analysis
                const a11yerrormessages = [
                    vscode.LanguageModelChatMessage.User(constants_1.CHAT_CONTEXT_PROMPT),
                    vscode.LanguageModelChatMessage.User(chatContext),
                    vscode.LanguageModelChatMessage.User(constants_1.LOG_PROMPT),
                    vscode.LanguageModelChatMessage.User(accessibilityLogContext),
                ];
                const chatResponse2 = await model.sendRequest(a11yerrormessages, {}, token);
                stream.markdown("\n");
                for await (const fragment of chatResponse2.text) {
                    stream.markdown(fragment);
                }
                // Part 3 of the chat - TODO extraction
                const toDomessages = [
                    vscode.LanguageModelChatMessage.User(constants_1.CHAT_CONTEXT_PROMPT),
                    vscode.LanguageModelChatMessage.User(chatContext),
                    vscode.LanguageModelChatMessage.User(constants_1.TODO_EXTRACT_PROMPT),
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
        }
        catch (err) {
            this.handleError(err, stream);
        }
        return { metadata: { command: "" } };
    }
}
exports.ChatHandler = ChatHandler;
//# sourceMappingURL=chatHandler.js.map