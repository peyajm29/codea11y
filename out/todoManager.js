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
exports.TodoManager = void 0;
const vscode = __importStar(require("vscode"));
class TodoManager {
    toDoList = [];
    /**
     * Extracts TODO items from a response string
     */
    extractToDos(response) {
        // Define the regular expression to match the patterns
        const regex = /(INFO|ERROR|WARNING): (.*?)(?=(INFO|ERROR|WARNING):|$)/gs;
        let match;
        // Use the regular expression to find all matches
        while ((match = regex.exec(response)) !== null) {
            let type;
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
            const toDoItem = {
                message: match[2].trim(),
                type: type,
            };
            this.toDoList.push(toDoItem);
        }
    }
    /**
     * Shows the TODO list as VS Code notifications
     */
    showToDoList() {
        let counter = 1;
        let error_messages = "Errors:\n";
        while (this.toDoList.length > 0) {
            const todoItem = this.toDoList.shift();
            if (todoItem) {
                if (todoItem.type === "error") {
                    vscode.window.showErrorMessage(todoItem.message);
                    error_messages += counter.toString() + ". " + todoItem.message + "\n";
                    counter++;
                }
                else if (todoItem.type === "warning") {
                    vscode.window.showWarningMessage(todoItem.message);
                    error_messages += counter.toString() + ". " + todoItem.message + "\n";
                    counter++;
                }
                else {
                    vscode.window.showInformationMessage(todoItem.message);
                    error_messages += counter.toString() + ". " + todoItem.message + "\n";
                    counter++;
                }
            }
        }
    }
}
exports.TodoManager = TodoManager;
//# sourceMappingURL=todoManager.js.map