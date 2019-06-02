/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------*/
import cp = require('child_process');
import path = require('path');
import util = require('util');
import vscode = require('vscode');

import { ZigDocumentSymbolProvider } from './outline';
import { detectProjectRoot } from "./zigUtil";
import { getTestFunctions } from "./testUtils";

const sendSignal = 'SIGKILL';
const outputChannel = vscode.window.createOutputChannel('Zig Tests');
const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
statusBarItem.command = 'zig.test.cancel';
statusBarItem.text = '$(x) Cancel Running Tests';

/**
 *  testProcesses holds a list of currently running test processes.
 */
const runningTestProcesses: cp.ChildProcess[] = [];

/**
 * Input to goTest.
 */
export interface TestConfig {
	/**
	 * absolute path to the zig file being tested`.
	 */
    fileName: string;
	/**
	 * Specific function names to test.
	 */
    functions?: string[];
	/**
	 * Test was not requested explicitly. The output should not appear in the UI.
	 */
    background?: boolean;

}





export function zigTestCurrentFile(args: string[]): Thenable<boolean> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No editor is active.');
        return;
    }
    return editor.document.save().then(() => {
        return getTestFunctions(editor.document, null).then(testFunctions => {
            const testConfig: TestConfig = {
                fileName: editor.document.fileName,
            };
            return zigTest(testConfig);
        })
    })
}




export function showTestOutput() {
    outputChannel.show(true);
}

/**
 * Iterates the list of currently running test processes and kills them all.
 */
export function cancelRunningTests(): Thenable<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        runningTestProcesses.forEach(tp => {
            tp.kill(sendSignal);
        });
        // All processes are now dead. Empty the array to prepare for the next run.
        runningTestProcesses.splice(0, runningTestProcesses.length);
        resolve(true);
    });
}



export function zigTest(testconfig: TestConfig): Thenable<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        // We do not want to clear it if tests are already running, as that could
        // lose valuable output.
        if (runningTestProcesses.length < 1) {
            outputChannel.clear();
        }

        if (!testconfig.background) {
            outputChannel.show(true);
        }

        var args: Array<string> = ['test', testconfig.fileName];
        if (testconfig.functions != null) {
            args.push('--test-filter');
            args = args.concat(testconfig.functions);
        }
        const config = vscode.workspace.getConfiguration('zig');
        const zigPath = config.get<string>('zigPath') || 'zig';
        const testType = 'tests';

        outputChannel.appendLine(['Running tool:', zigPath, ...args].join(' '));
        outputChannel.appendLine('');

        // ensure that user provided flags are appended last (allow use of -args ...)

        const tp = cp.spawn(zigPath, args, { cwd: detectProjectRoot(testconfig.fileName) });

        tp.stdout.on('data', chunk => outputChannel.appendLine(chunk.toString()));
        tp.stderr.on('data', chunk => outputChannel.append(chunk.toString()));

        statusBarItem.show();

        tp.on('close', (code, signal) => {
            if (code) {
                outputChannel.appendLine(`Error: ${testType} failed.`);
            } else if (signal === sendSignal) {
                outputChannel.appendLine(`Error: ${testType} terminated by user.`);
            } else {
                outputChannel.appendLine(`Success: ${testType} passed.`);
            }

            const index = runningTestProcesses.indexOf(tp, 0);
            if (index > -1) {
                runningTestProcesses.splice(index, 1);
            }

            if (!runningTestProcesses.length) {
                statusBarItem.hide();
            }
            resolve(code === 0);
        });
        runningTestProcesses.push(tp);
    });
}


export function testAtCursor(args: any) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No editor is active.');
        return;
    }

    editor.document.save().then(async () => {
        try {
            const testFunctions = await getTestFunctions(editor.document, null);
            // We use functionName if it was provided as argument
            // Otherwise find any test function containing the cursor.
            const testFunctionName = args && args.functionName
                ? args.functionName
                : testFunctions.filter(func => func.range.contains(editor.selection.start))
                    .map(el => el.name)[0];
            if (!testFunctionName) {
                vscode.window.showInformationMessage('No test function found at cursor.');
                return;
            }
            await runTestAtCursor(editor, testFunctionName, args);
        } catch (err) {
            console.error(err);
        }
    });
}

async function runTestAtCursor(editor: vscode.TextEditor, testFunctionName: string, args: any) {
    const testConfig: TestConfig = {
        fileName: editor.document.fileName,
        functions: [testFunctionName],
    };
    await zigTest(testConfig);
}