import {
  Decoration,
  EditorView,
  keymap,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";
import { EditorState, Range, StateField } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { type SyntaxNodeRef } from "@lezer/common";
import { themeColors } from "./theme";

export default function () {
  return [
    styleBetterCursorAndSelection,
    markdown({ base: markdownLanguage }),
    renderHorizontalRule,
    renderBlockquote,
    hideSyntaxTokens,
    renderLists,
    renderTaskLists,
    toggleTaskListCommand,
    renderLinks,
  ];
}

const styleBetterCursorAndSelection = EditorView.theme({
  ".cm-cursor": {
    borderLeftWidth: "2.5px",
    borderRadius: "100vw",
  },
  ".cm-selectionBackground": {
    borderRadius: "0.25em",
  },
});

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
                Decoration.mark({
                  attributes: {
                    class: "cm-tomatenmark-hr",
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
      ".cm-tomatenmark-hr": {
        color: "transparent !important",
      },
      ".cm-tomatenmark-hr::after": {
        content: '""',
        position: "absolute",
        display: "block",
        borderTop: "3px solid var(--color-border)",
        width: "100%",
        borderRadius: "100vw",
        transform: "translateY(-0.75em)",
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
        const syntaxPairs = [
          { mark: "EmphasisMark", parent: ["StrongEmphasis", "Emphasis"] },
          { mark: "StrikethroughMark", parent: ["Strikethrough"] },
          { mark: "CodeMark", parent: ["InlineCode"] },
          { mark: "QuoteMark" },
        ];

        let decorations: Range<Decoration>[] = [];
        syntaxTree(state).iterate({
          enter(node) {
            const pair = syntaxPairs.find(({ mark }) => node.name === mark);
            if (pair) {
              const selectionTouchesMark = selectionTouchesNodeAtCharacter(
                state,
                node,
              );
              const selectionTouchesContent =
                node.node.parent &&
                pair.parent &&
                pair.parent.includes(node.node.parent?.name) &&
                selectionTouchesNodeAtCharacter(state, node.node.parent);
              if (!selectionTouchesMark && !selectionTouchesContent) {
                decorations.push(
                  Decoration.replace({}).range(node.from, node.to),
                );
              }
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

const toggleTaskListCommand = ViewPlugin.define(() => ({}), {
  provide: () => [
    keymap.of([
      {
        key: "Ctrl-l",
        run: (view) => {
          const { state } = view;
          const changes = state.changeByRange((range) => {
            const line = state.doc.lineAt(range.head);
            const lineText = line.text;
            const taskMarkerMatch = lineText.match(/^\s*[-*]\s+\[( |x)\]/);
            if (taskMarkerMatch) {
              const isChecked = taskMarkerMatch[1] === "x";
              const newMarker = isChecked ? "[ ]" : "[x]";
              const from =
                line.from +
                taskMarkerMatch.index! +
                taskMarkerMatch[0].length -
                3;
              return {
                changes: { from, to: from + 3, insert: newMarker },
                range,
              };
            }
            return { changes: [], range };
          });
          view.dispatch(changes);
          return true;
        },
      },
    ]),
  ],
});

const renderLinks = ViewPlugin.define(() => ({}), {
  provide: () => [
    StateField.define<DecorationSet>({
      create(state) {
        let decorations: Range<Decoration>[] = [];
        syntaxTree(state).iterate({
          enter(node) {
            const pushLinkDecoration = (title: string, url: string) => {
              decorations.push(
                Decoration.replace({
                  widget: new (class extends WidgetType {
                    eq() {
                      return true;
                    }
                    toDOM(): HTMLElement {
                      const link = document.createElement("a");
                      link.href = url;
                      link.textContent = title;
                      link.className = "cm-tomatenmark-link";
                      link.target = "_blank";
                      return link;
                    }
                  })(),
                }).range(node.from, node.to),
              );
            };

            if (
              node.name === "Link" &&
              !selectionTouchesNodeAtCharacter(state, node)
            ) {
              const markdown = state.doc.sliceString(node.from, node.to);
              // match link title and url from markdown string
              const match = markdown.match(/\[(.*?)\]\((.*?)\)/);
              if (!match) return;
              const title = match[1];
              const url = match[2];
              pushLinkDecoration(title, url);
            }
            if (
              node.name === "URL" &&
              !node.matchContext(["Link"]) &&
              !selectionTouchesNodeAtCharacter(state, node)
            ) {
              const url = state.doc.sliceString(node.from, node.to);
              pushLinkDecoration(url, url);
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
      ".cm-tomatenmark-link": {
        color: themeColors.primary,
        textDecoration: "underline",
        // to make space for absolutely-positioned external link icon
        marginRight: "18px",
      },
      ".cm-tomatenmark-link:hover": {
        textDecoration: "none",
      },
      ".cm-tomatenmark-link::after": {
        // https://tablericons.com/icon/external-link
        // https://www.urlencoder.org
        content:
          'url("data:image/svg+xml,%3Csvg%0A%20%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%0A%20%20width%3D%2220%22%0A%20%20height%3D%2220%22%0A%20%20viewBox%3D%220%200%2024%2024%22%0A%20%20fill%3D%22none%22%0A%20%20stroke%3D%22%2304a351%22%0A%20%20stroke-width%3D%222%22%0A%20%20stroke-linecap%3D%22round%22%0A%20%20stroke-linejoin%3D%22round%22%0A%3E%0A%20%20%3Cpath%20d%3D%22M12%206h-6a2%202%200%200%200%20-2%202v10a2%202%200%200%200%202%202h10a2%202%200%200%200%202%20-2v-6%22%20%2F%3E%0A%20%20%3Cpath%20d%3D%22M11%2013l9%20-9%22%20%2F%3E%0A%20%20%3Cpath%20d%3D%22M15%204h5v5%22%20%2F%3E%0A%3C%2Fsvg%3E")',
        fontWeight: "bolder",
        fontSize: "0.8em",
        color: themeColors.primary,
        position: "absolute",
      },
    }),
  ],
});
