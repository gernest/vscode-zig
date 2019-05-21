import vscode = require('vscode');
import { documentSymbols, ZigOutlineOptions } from "./zigOutline";

export function getTestFunctions(doc: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.DocumentSymbol[]> {
    const opts: ZigOutlineOptions = {
        document: doc,
        fileName: doc.fileName,
        filter: (decl) => { return decl.type === "test" },
    };
    return documentSymbols(opts);
}
