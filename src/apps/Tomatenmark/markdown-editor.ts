import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { EditorState, Range, StateField } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { type SyntaxNodeRef } from "@lezer/common";

export default function () {
  return [
    markdown({ base: markdownLanguage }),
    renderHorizontalRule,
    renderBlockquote,
    hideSyntaxTokens,
    renderLists,
    renderTaskLists,
  ];
}

function selectionTouchesNodeAtCharacter(
  state: EditorState,
  node: SyntaxNodeRef,
) {
  return state.selection.ranges.some((selection) => {
    return selection.from <= node.to && selection.to >= node.from;
  });
}

function selectionTouchesNodeAtLine(state: EditorState, node: SyntaxNodeRef) {
  return state.selection.ranges.some((selection) => {
    const selectionLineFrom = state.doc.lineAt(selection.from).number;
    const selectionLineTo = state.doc.lineAt(selection.to).number;
    const nodeLineFrom = state.doc.lineAt(node.from).number;
    const nodeLineTo = state.doc.lineAt(node.to).number;
    return selectionLineFrom <= nodeLineTo && selectionLineTo >= nodeLineFrom;
  });
}

const renderHorizontalRule = ViewPlugin.define(() => ({}), {
  provide: () => [
    StateField.define<DecorationSet>({
      create(state) {
        let decorations: Range<Decoration>[] = [];
        syntaxTree(state).iterate({
          enter(node) {
            if (
              node.name === "HorizontalRule" &&
              !selectionTouchesNodeAtLine(state, node)
            ) {
              decorations.push(
                Decoration.replace({
                  widget: new (class extends WidgetType {
                    eq() {
                      return true;
                    }
                    toDOM(): HTMLElement {
                      const div = document.createElement("div");
                      div.className = "cm-tomatenmark-hr";
                      div.appendChild(document.createElement("hr"));
                      return div;
                    }
                    ignoreEvent() {
                      return false;
                    }
                  })(),
                }).range(node.from, node.to),
              );
            }
          },
        });
        return Decoration.set(decorations);
      },
      update(_, tr) {
        return this.create(tr.state);
      },
      provide: (field) => EditorView.decorations.from(field),
    }),
    EditorView.baseTheme({
      ".cm-tomatenmark-hr": {
        height: "22.4px",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      },
      ".cm-tomatenmark-hr hr": {
        width: "100%",
        border: "none",
        borderTop: "2px solid var(--color-border)",
      },
    }),
  ],
});

const renderBlockquote = ViewPlugin.define(() => ({}), {
  provide: () => [
    StateField.define<DecorationSet>({
      create(state) {
        let decorations: Range<Decoration>[] = [];
        syntaxTree(state).iterate({
          enter(node) {
            if (node.name === "Blockquote") {
              decorations.push(
                Decoration.mark({
                  tagName: "line",
                  attributes: {
                    class: "cm-tomatenmark-blockquote",
                  },
                }).range(node.from, node.to),
              );
            }
          },
        });
        return Decoration.set(decorations);
      },
      update(_, tr) {
        return this.create(tr.state);
      },
      provide: (field) => EditorView.decorations.from(field),
    }),
    EditorView.baseTheme({
      ".cm-tomatenmark-blockquote": {
        borderLeft: "3px solid var(--color-primary)",
        padding: "2px 0 2px 4px",
      },
    }),
  ],
});

const hideSyntaxTokens = ViewPlugin.define(() => ({}), {
  provide: () => [
    StateField.define<DecorationSet>({
      create(state) {
        let decorations: Range<Decoration>[] = [];
        syntaxTree(state).iterate({
          enter(node) {
            if (
              (node.name === "QuoteMark" ||
                node.name === "EmphasisMark" ||
                node.name === "StrikethroughMark" ||
                node.name === "CodeMark") &&
              !selectionTouchesNodeAtLine(state, node)
            ) {
              decorations.push(
                Decoration.replace({}).range(node.from, node.to),
              );
            }
            if (
              node.name === "HeaderMark" &&
              !selectionTouchesNodeAtLine(state, node)
            ) {
              decorations.push(
                Decoration.replace({}).range(node.from, node.to + 1),
              );
            }
          },
        });
        return Decoration.set(decorations);
      },
      update(_, tr) {
        return this.create(tr.state);
      },
      provide: (field) => EditorView.decorations.from(field),
    }),
  ],
});

const renderLists = ViewPlugin.define(() => ({}), {
  provide: () => [
    StateField.define<DecorationSet>({
      create(state) {
        let decorations: Range<Decoration>[] = [];
        syntaxTree(state).iterate({
          enter(node) {
            if (
              node.name === "ListMark" &&
              node.matchContext(["BulletList", "ListItem"]) &&
              !selectionTouchesNodeAtCharacter(state, node)
            ) {
              decorations.push(
                Decoration.mark({
                  tagName: "span",
                  class: "cm-tomatenmark-bullet-list-mark",
                }).range(node.from, node.to),
              );
            }

            if (
              node.name === "ListMark" &&
              node.matchContext(["OrderedList", "ListItem"])
            ) {
              decorations.push(
                Decoration.mark({
                  class: "cm-tomatenmark-ordered-list-mark",
                }).range(node.from, node.to),
              );
            }
          },
        });
        return Decoration.set(decorations);
      },
      update(_, tr) {
        return this.create(tr.state);
      },
      provide: (field) => EditorView.decorations.from(field),
    }),
    EditorView.baseTheme({
      ".cm-tomatenmark-bullet-list-mark": {
        position: "relative",
      },
      ".cm-tomatenmark-bullet-list-mark *": {
        color: "transparent",
        opacity: "100%",
      },
      ".cm-tomatenmark-bullet-list-mark *::after": {
        content: '"•"',
        color: "var(--color-primary)",
        fontFamily: "var(--font-sans) !important",
        position: "absolute",
        left: "0",
        bottom: "0",
        cursor: "text",
      },
      ".cm-tomatenmark-ordered-list-mark *": {
        opacity: "100% !important",
      },
    }),
  ],
});

const renderTaskLists = ViewPlugin.define(() => ({}), {
  provide: () => [
    StateField.define<DecorationSet>({
      create(state) {
        let decorations: Range<Decoration>[] = [];
        syntaxTree(state).iterate({
          enter(node) {
            if (node.name === "Task") {
              const taskMarker = node.node.firstChild!;
              const isChecked = state.doc
                .sliceString(taskMarker.from, taskMarker.to)
                .includes("[x]");
              if (isChecked) {
                decorations.push(
                  Decoration.mark({
                    class: "cm-tomatenmark-task-checked",
                  }).range(node.from, node.to),
                );
              }
            }
            if (
              node.name === "TaskMarker" &&
              !selectionTouchesNodeAtCharacter(state, node)
            ) {
              const text = state.doc.sliceString(node.from, node.to);
              const isChecked = text.includes("[x]");
              decorations.push(
                Decoration.replace({
                  widget: new (class extends WidgetType {
                    eq() {
                      return true;
                    }
                    toDOM(): HTMLElement {
                      const checkbox = document.createElement("input");
                      checkbox.type = "checkbox";
                      checkbox.checked = isChecked;
                      checkbox.className = "cm-tomatenmark-task-list-checkbox";
                      return checkbox;
                    }
                    ignoreEvent() {
                      return false;
                    }
                  })(),
                }).range(node.from, node.to),
              );
            }
          },
        });
        return Decoration.set(decorations, true);
      },
      update(_, tr) {
        return this.create(tr.state);
      },
      provide: (field) => EditorView.decorations.from(field),
    }),
    EditorView.baseTheme({
      // see https://moderncss.dev/pure-css-custom-checkbox-style/
      ".cm-tomatenmark-task-list-checkbox": {
        "-webkit-appearance": "none",
        appearance: "none",
        width: "1em",
        height: "1em",
        margin: "0",
        border: "0.15em solid var(--color-primary)",
        borderRadius: "0.15em",
        display: "inline-flex",
        transform: "translateY(+3px)",
        "&:checked": {
          backgroundColor: "var(--color-primary)",
        },
        cursor: "pointer",
      },
      ".cm-tomatenmark-task-checked": {
        opacity: "0.5",
        textDecoration: "line-through",
      },
    }),
  ],
  eventHandlers: {
    mousedown: (event, view) => {
      const target = event.target as HTMLElement;
      if (view.state.readOnly) return;
      if (
        target.nodeName === "INPUT" &&
        target.classList.contains("cm-tomatenmark-task-list-checkbox")
      ) {
        const position = view.posAtDOM(target);
        const before = view.state.doc.sliceString(position, position + 3);
        if (before === "[ ]") {
          view.dispatch({
            changes: { from: position, to: position + 3, insert: "[x]" },
          });
          return true;
        } else if (before === "[x]") {
          view.dispatch({
            changes: { from: position, to: position + 3, insert: "[ ]" },
          });
          return true;
        } else {
          return false;
        }
      }
    },
  },
});
