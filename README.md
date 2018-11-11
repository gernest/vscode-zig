# vscode-zig

[Zig](http://ziglang.org/) support for Visual Studio Code.

![Syntax Highlighting](./images/example.png)

## Features

 - syntax highlighting
 - basic compiler linting
 - automatic formatting
 - snippets

## Automatic Formatting

To enable automatic formatting, the `zig.formatCommand` property must be
configured in your settings. This should be the command to run `zig fmt`, which
can is found on the current [stage2
compiler](https://github.com/ziglang/zig#stage-2-build-self-hosted-zig-from-zig-source-code).


## planned features

- [ ] show hovers
- [ ] code completion
- [ ] diagnosis
- [ ] function and method signature help
- [ ] go to definition
- [ ] find all references to a symbol
- [ ] highlight occupance of a symbol in a document
- [ ] show all symbol definitions within a document
- [ ] show all symbol definitions in a folder
- [ ] possible actions on errors or warning
- [ ] code lens
- [ ] rename symbol
- [ ] format source code in editor
- [ ] incrementally Format Code as the User Types