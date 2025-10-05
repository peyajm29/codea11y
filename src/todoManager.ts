import * as vscode from "vscode";
import { ToDoItem, ToDoType } from "./types";

export class TodoManager {
  private toDoList: ToDoItem[] = [];

  /**
   * Extracts TODO items from a response string
   */
  public extractToDos(response: string): void {
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
      this.toDoList.push(toDoItem);
    }
  }

  /**
   * Shows the TODO list as VS Code notifications
   */
  public showToDoList(): void {
    let counter = 1;
    
    while (this.toDoList.length > 0) {
      const todoItem = this.toDoList.shift();
      if (todoItem) {
        if (todoItem.type === "error") {
          vscode.window.showErrorMessage(todoItem.message);
        } else if (todoItem.type === "warning") {
          vscode.window.showWarningMessage(todoItem.message);
        } else {
          vscode.window.showInformationMessage(todoItem.message);
        }
        counter++;
      }
    }
  }
}