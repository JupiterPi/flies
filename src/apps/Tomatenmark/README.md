# Tomatenmark

Tomatenmark is a markdown editor built on top of CodeMirror, with the goal of providing a similar live-preview editing experience to that of Obsidian.

## Todo

- [x] render most formatting styles
- [x] render horizontal rules
- [x] render blockquotes
- [x] hide syntax tokens such as emphasis markers etc.
  - [x] also render them when inside of opening/closing marks selected
- [x] render bullet point lists
- [x] render ordered lists
- [x] render task lists
- [ ] links (clickable, hide url, different kinds, ...)
- [ ] images (inserting them and saving at appropriate `attachments` location, rendering them, sensible sizing)
- [ ] math (inline and block)
- [x] fix: skipping of lines when navigating via arrow keys through formatted widgets apparently
      (apparently, that happens because the cursor won't move into widgets, so we use a mark decoration instead and hide the element)
- [x] fix: proper `Home` key behaviour
- [ ] move to start of text when pressing `Home` key in a list line
- [x] keybind to toggle task lists checked
- [x] keybind to move lines up or down -> already exists
- [x] make checkboxes prettier, and check mobile usage again
- [ ] formatting keybinds like `Ctrl+B` etc., as well as `*` etc.
- [ ] tables
- [ ] make sure ordinals always update, also on deletion
- [ ] linking between files in Flies (autocompletion, updating upon rename)
- [ ] indent wrapped text too (e.g. in lists)
- [ ] better heading spacing?
- [ ] background color for inline and block code
- [ ] render code blocks better
- [ ] render comments better
- [ ] render ordinals more prettily
- [ ] heading folding
- [ ] polished readonly mode
- [ ] handle nested blockquotes properly
- [ ] better formatting of literal asterisks
- [ ] footnotes?
- [ ] maybe some inline html like `details` or `summary`
- [ ] clear up `theme.ts`
- [ ] better find (`Ctrl+F`) interface
- [ ] mobile formatting bar
- [ ] embedding Excalidraw files (very low prio)
- [x] nicer cursor and selection
- [ ] smooth cursor (see https://github.com/kotaindah55/animated-cursor/tree/master)
