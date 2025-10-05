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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const chatHandler_1 = require("./chatHandler");
const constants_1 = require("./constants");
function activate(context) {
    console.log("Activating CodeA11y extension...");
    if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
        console.log("No workspace folder found. Some features may be limited.");
    }
    const chatHandler = new chatHandler_1.ChatHandler();
    const handler = async (request, context, stream, token) => {
        return await chatHandler.handleChatRequest(request, context, stream, token);
    };
    const CodeA11y = vscode.chat.createChatParticipant(constants_1.CodeA11y_PARTICIPANT_ID, handler);
    CodeA11y.iconPath = vscode.Uri.joinPath(context.extensionUri, "cute_robot_icon.svg");
    context.subscriptions.push(CodeA11y);
}
function deactivate() { }
//# sourceMappingURL=extension.js.map