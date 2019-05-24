'use strict';
import * as vscode from 'vscode';
import ZigCompilerProvider from './zigCompilerProvider';
import { ZigFormatProvider, ZigRangeFormatProvider } from './zigFormat';
import { ZigRunTestCodeLensProvider } from "./zigRunTestCodeLens";
import { ZigDocumentSymbolProvider } from "./zigOutline";
import { cancelRunningTests, zigTestCurrentFile, testAtCursor } from "./testing";
const ZIG_MODE: vscode.DocumentFilter = { language: 'zig', scheme: 'file' };

export function activate(context: vscode.ExtensionContext) {
    let compiler = new ZigCompilerProvider();
    compiler.activate(context.subscriptions);
    vscode.languages.registerCodeActionsProvider('zig', compiler);

    const zigFormatStatusBar = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left,
    );
    const logChannel = vscode.window.createOutputChannel('zig');
    context.subscriptions.push(logChannel);
    context.subscriptions.push(
        vscode.languages.registerDocumentFormattingEditProvider(
            ZIG_MODE,
            new ZigFormatProvider(logChannel),
        ),
    );

    context.subscriptions.push(
        vscode.languages.registerDocumentRangeFormattingEditProvider(
            ZIG_MODE,
            new ZigRangeFormatProvider(logChannel),
        ),
    );
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider(
            ZIG_MODE,
            new ZigRunTestCodeLensProvider(logChannel),
        ),
    );
    context.subscriptions.push(
        vscode.languages.registerDocumentSymbolProvider(
            ZIG_MODE,
            new ZigDocumentSymbolProvider(),
        ),
    );

    context.subscriptions.push(vscode.commands.registerCommand('zig.test.cancel', () => {
        cancelRunningTests();
    }));

    context.subscriptions.push(vscode.commands.registerCommand('zig.test.file', (args) => {
        zigTestCurrentFile(args);
    }));

    context.subscriptions.push(vscode.commands.registerCommand('zig.test.cursor', (args) => {
        testAtCursor(args);
    }));

}

export function deactivate() {
}
