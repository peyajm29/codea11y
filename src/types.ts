import * as vscode from "vscode";

export interface ICodeA11yChatResult extends vscode.ChatResult {
  metadata: {
    command: string;
  };
}

export type ToDoType = "info" | "error" | "warning";

export interface ToDoItem {
  message: string;
  type: ToDoType;
}