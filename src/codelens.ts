/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/

'use strict';

import vscode = require('vscode');
import { CancellationToken, CodeLens, Command, TextDocument } from 'vscode';
import { ZigDocumentSymbolProvider } from './outline';
import { getTestFunctions } from './testUtils';


export class ZigRunTestCodeLensProvider implements vscode.CodeLensProvider {
    private _channel: vscode.OutputChannel;

    constructor(logChannel: vscode.OutputChannel) {
        this._channel = logChannel;
    }
    public provideCodeLenses(document: TextDocument, token: CancellationToken): CodeLens[] | Thenable<CodeLens[]> {
        const config = vscode.workspace.getConfiguration('zig', document.uri);
        const logger = this._channel;
        return Promise.all([
            this.getCodeLensForPackage(document, token),
            this.getCodeLensForFunctions(config, document, token)
        ]).then(([pkg, fns]) => {
            logger.clear();
            let res: any[] = [];
            if (pkg && Array.isArray(pkg)) {
                res = res.concat(pkg);
            }
            if (fns && Array.isArray(fns)) {
                res = res.concat(fns);
            }
            return res;
        }).catch(e => {
            logger.clear();
            logger.appendLine('outline: ' + e.toString());
            return null;
        });
    }

    private async getCodeLensForPackage(document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
        var hasPackageTests = false;
        const documentSymbolProvider = new ZigDocumentSymbolProvider((decl) => {
            if (decl.type == "test") {
                hasPackageTests = true;
            }
            return true;
        });
        const symbols = await documentSymbolProvider.provideDocumentSymbols(document, token);
        const pkg = symbols[0];
        if (!hasPackageTests) {
            return;
        }
        const range = pkg.range;
        const packageCodeLens = [
            new CodeLens(range, {
                title: 'run file tests',
                command: 'zig.test.file'
            })
        ];
        return packageCodeLens;
    }

    private async getCodeLensForFunctions(vsConfig: vscode.WorkspaceConfiguration, document: TextDocument, token: CancellationToken): Promise<CodeLens[]> {
        const codelens: CodeLens[] = [];

        const testPromise = getTestFunctions(document, token).then(testFunctions => {
            testFunctions.forEach(func => {
                const runTestCmd: Command = {
                    title: 'run this test',
                    command: 'zig.test.cursor',
                    arguments: [{ functionName: func.name }]
                };
                codelens.push(new CodeLens(func.range, runTestCmd));
            });
        });
        await Promise.all([testPromise]);
        return codelens;
    }
}
