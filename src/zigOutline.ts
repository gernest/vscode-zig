import vscode = require('vscode');
import { execCmd } from './zigUtil';

export interface ZigOutlineRange {
    start: number;
    end: number;
}

export interface ZigOutlineDeclaration {
    label: string;
    type: string;
    receiverType?: string;
    icon?: string; // icon class or null to use the default images based on the type
    start: number;
    end: number;
    children?: ZigOutlineDeclaration[];
    signature?: ZigOutlineRange;
    comment?: ZigOutlineRange;
}
export interface ZigOutlineOptions {
	/**
	 * Path of the file for which outline is needed
	 */
    fileName: string;


	/**
	 * Document to be parsed. If not provided, saved contents of the given fileName is used
	 */
    document?: vscode.TextDocument;

    filter?: (decl: ZigOutlineDeclaration) => boolean;
}

export function runZigOutline(opts: ZigOutlineOptions): Promise<ZigOutlineDeclaration[]> {
    return new Promise<ZigOutlineDeclaration[]>((resolve, reject) => {
        const config = vscode.workspace.getConfiguration('zig');
        const hoodiePath = config.get<string>('hoodiePath') || 'hoodie';
        const options = {
            cmdArguments: ['outline', opts.fileName],
            notFoundText: 'Could not find hoodie. Please add zig to your PATH or specify a custom path to the zig binary in your settings.',
        };
        return execCmd(hoodiePath, options).then(({ stdout }) => {
            const result = stdout.toString();
            const decl = <ZigOutlineDeclaration[]>JSON.parse(result);
            return resolve(decl)
        }).catch(e => {
            reject(e)
        })
    })
}


export async function documentSymbols(opts: ZigOutlineOptions): Promise<vscode.DocumentSymbol[]> {
    const decls = await runZigOutline(opts);
    if (opts.filter) {
        return convertToCodeSymbols(opts.document, decls.filter(opts.filter));
    }
    return convertToCodeSymbols(opts.document, decls);
}


export function convertToCodeSymbols(
    document: vscode.TextDocument,
    decls: ZigOutlineDeclaration[],
): vscode.DocumentSymbol[] {
    const symbols: vscode.DocumentSymbol[] = [];
    (decls || []).forEach(decl => {
        const label = decl.label;
        const start = decl.start;
        const end = decl.end;
        const startPosition = document.positionAt(start);
        const endPosition = document.positionAt(end);
        const symbolRange = new vscode.Range(startPosition, endPosition);
        const selectionRange = startPosition.line == endPosition.line ?
            symbolRange :
            new vscode.Range(startPosition, document.lineAt(startPosition.line).range.end);
        const symbolInfo = new vscode.DocumentSymbol(
            decl.type === 'test' ? `test "${label}"` : label,
            decl.type,
            zigKindToCodeKind[decl.type],
            symbolRange,
            selectionRange);
        symbols.push(symbolInfo);
        if (decl.children) {
            symbolInfo.children = convertToCodeSymbols(document, decl.children);
        }
    });
    return symbols;
}

const zigKindToCodeKind: { [key: string]: vscode.SymbolKind } = {
    'enum': vscode.SymbolKind.Enum,
    'import': vscode.SymbolKind.Namespace,
    'const': vscode.SymbolKind.Constant,
    'variable': vscode.SymbolKind.Variable,
    'union': vscode.SymbolKind.Interface,
    'test': vscode.SymbolKind.Function,
    'function': vscode.SymbolKind.Function,
    'struct': vscode.SymbolKind.Struct,
};

export class ZigDocumentSymbolProvider implements vscode.DocumentSymbolProvider {
    constructor(private filter?: (ZigOutlineDeclaration) => boolean) { }
    public provideDocumentSymbols(document: vscode.TextDocument, token: vscode.CancellationToken): Thenable<vscode.DocumentSymbol[]> {
        const options: ZigOutlineOptions = {
            fileName: document.fileName,
            document,
            filter: this.filter,
        };
        return documentSymbols(options);
    }
}
