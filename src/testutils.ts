import vscode = require('vscode');
import { runZigOutline, ZigOutlineOptions, convertToCodeSymbols } from "./zigOutline";

export function getTestFunctions(doc: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.DocumentSymbol[]> {
    const opts: ZigOutlineOptions = {
        document: doc,
        fileName: doc.fileName,
    };
    return runZigOutline(opts).then((decls => {
        decls = decls.filter(v => v.type === "test");
        return convertToCodeSymbols(opts.document, decls);
    }))
}
