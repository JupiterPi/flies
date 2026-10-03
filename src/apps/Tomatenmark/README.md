# Tomatenmark

Tomatenmark is a markdown editor built on top of CodeMirror, with the goal of providing a similar live-preview editing experience to that of Obsidian.

## Todo

- [x] render most formatting styles
- [x] render horizontal rules
- [x] render blockquotes
  - [ ] handle nested blockquotes properly
- [x] hide syntax tokens such as emphasis markers etc.
  - [ ] handle more of them
  - [ ] also render then when inside of opening/closing marks selected
- [x] render bullet point lists
- [x] render ordered lists
  - [ ] render ordinals more prettily
  - [ ] make sure ordinals always update, also on deletion
- [x] render task lists
  - [ ] make checkboxes prettier, and check mobile usage
  - [ ] keybind to toggle checked
- [ ] indent wrapped text too (e.g. in lists)
- [ ] better heading spacing?
- [ ] background color for inline and block code
- [ ] links (clickable, hide url, different kinds, ...)
- [ ] images (inserting them and saving at appropriate `attachments` location, rendering them, sensible sizing)
- [ ] tables
- [ ] footnotes?
- [ ] math (inline and block)
- [ ] maybe some inline html like `details` or `summary`
- [ ] better formatting of literal asterisks
- [ ] fix: skipping of lines when navigating via arrow keys through formatted widgets apparently
- [ ] heading folding
- [ ] clear up `theme.ts`
- [ ] fix: proper `Home` key behaviour
- [ ] keybind to move lines up or down
- [ ] better find (`Ctrl+F`) interface
- [ ] polished readonly mode
- [ ] linking between files in Flies (autocompletion, updating upon rename)
- [ ] embedding Excalidraw files (very low prio)
