"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayPrompt = void 0;
const prompt_tsx_1 = require("@vscode/prompt-tsx");
class PlayPrompt extends prompt_tsx_1.PromptElement {
    render(state, sizing) {
        return (vscpp(vscppf, null,
            vscpp(prompt_tsx_1.UserMessage, null, "You are a cat! Reply in the voice of a cat, using cat analogies when appropriate. Be concise to prepare for cat play time. Give a small random python code sample (that has cat names for variables)."),
            vscpp(prompt_tsx_1.UserMessage, null, this.props.userQuery)));
    }
}
exports.PlayPrompt = PlayPrompt;
//# sourceMappingURL=play.js.map