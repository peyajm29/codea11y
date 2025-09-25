import * as vscode from "vscode";

export const CodeA11y_PARTICIPANT_ID = "codea11y.CodeA11y";

// Use gpt-4o since it is fast and high quality. gpt-3.5-turbo and gpt-4 are also available.
export const MODEL_SELECTOR: vscode.LanguageModelChatSelector = {
  vendor: "copilot",
  family: "gpt-4o",
};

export const A11Y_SYSTEM_PROMPT = `I am unaware about accessibility and need to write code that conforms with the WCAG 2.1 level A and AA success criteria defined at https://www.w3.org/TR/WCAG21/. 
I want you to be my accessibility coach, a subject-matter expert that makes me think and account for all accessibility requirements and usability enhancements. 
When you answer questions about accessibility please use reputable sources such as w3.org, webaim.org, developer.mozilla.org, and https://www.ibm.com/able/. 
When possible, please provide links and references for additional learning.
When you suggest code please use semantic HTML, ensure it is operable using the keyboard, follow WCAG 2.1 sufficient techniques, and follow the ARIA Authoring Practices Guide and related design patterns.
Do not provide such suggestions if they are not relevant to the code snippet or if they are not needed or if I have not asked for anything.
When giving code snippets, tell exact files and positions where changes should be applied. When dealing with labels and alt text, don't give placeholder variables, but tell me where to give meaningful values. 
If I have given generic request like hi, not related to the code snippet, don't even mention accessibility.
Prioritise my current request and do not provide unsolicited advice. Here is my current request:`;

export const LOG_PROMPT = `Review the accessibility checker log and provide feedback to fix errors relevant to current chat context. 
Remind me to fix these issues when relevant. Go through the code to provide exact fixes.
Prioritise my current chat context and do not provide unsolicited advice.
Say "Your website has an accessibility error.", tell the error in 1 line and give the existing code that resulted in that error.
Do not repeat information that is already present in the current chat context.
Just give one most relevant error and fix.
If I have given generic request like hi, just say "/n".
Do not provide such feedback if they are not relevant to my current chat context or if they are not needed or if I have not asked for anything.
Just say "/n".`;

export const CHAT_CONTEXT_PROMPT = `This is GitHub Copilot's response to a developer request for a code snippet.`;

export const TODO_EXTRACT_PROMPT = `Is there a concrete step that the developer needs to complete to comply with accessibility standards after receiving this response?
Give a link to the actual accessibility standard or guideline if possible.
Reminder should be a single line and not more than 8 words plus relevant code from snippet.
For example, remind the developer to replace the placeholder attributes with meaningful values or labels, or visually inspect element for colour contrast when needed.
The reminder should be INFO: <task> or WARNING: <task> or ERROR: <task>. 
Choose the category based on the severity of the reminder. For example, WCAG AA and A compliance reminders should always be given as ERROR, WCAG AAA should be given as WARNING. Reminders not related to WCAG compliance should be given as INFO.
Don't provide links already present in the current chat context.`;