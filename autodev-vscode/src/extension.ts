import * as vscode from 'vscode';
import { AutoDevSidebarProvider } from './sidebar';
import * as http from 'http';

export function activate(context: vscode.ExtensionContext) {
    console.log('AutoDev Copilot is now active!');

    const provider = new AutoDevSidebarProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(AutoDevSidebarProvider.viewType, provider)
    );

    const BACKEND_URL = "http://127.0.0.1:8001/api";

    function sendCommand(endpoint: string, payload: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const postData = JSON.stringify(payload);
            const config = vscode.workspace.getConfiguration('autodev');
            const backendPort = config.get<number>('backendPort', 8001);

            const options = {
                hostname: '127.0.0.1',
                port: backendPort,
                path: `/api/${endpoint}`,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(postData)
                }
            };
            const req = http.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    try {
                        const result = JSON.parse(body);
                        resolve(result.output);
                    } catch (e) {
                        resolve(body);
                    }
                });
            });
            req.on('error', (err) => {
                vscode.window.showErrorMessage(`AutoDev Connection Error: ${err.message}`);
                resolve(null);
            });
            req.write(postData);
            req.end();
        });
    }

    let disposableAsk = vscode.commands.registerCommand('autodev.ask', async () => {
        const query = await vscode.window.showInputBox({ prompt: "What do you want AutoDev to do?" });
        if (!query) return;

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "AutoDev Copilot is thinking...",
            cancellable: false
        }, async (progress) => {
            const output = await sendCommand("ask", { query, target: "", context: {} });
            if (output) {
                provider.addResponse(`📝 **Task:** ${query}\n\n${output}`);
            }
        });
    });

    let disposableFix = vscode.commands.registerCommand('autodev.fix', async () => {
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "AutoDev Copilot is analyzing the project...",
            cancellable: false
        }, async (progress) => {
            const output = await sendCommand("fix", { query: "", target: "all", context: {} });
            if (output) {
                provider.addResponse(`🔧 **Fix Scan Report:**\n\n${output}`);
            }
        });
    });

    let disposableExplain = vscode.commands.registerCommand('autodev.explain', async () => {
        const editor = vscode.window.activeTextEditor;
        let target = "all";
        if (editor) {
            target = editor.document.fileName;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: "AutoDev Copilot is explaining...",
            cancellable: false
        }, async (progress) => {
            const output = await sendCommand("explain", { query: "", target, context: {} });
            if (output) {
                provider.addResponse(`📖 **Explanation:**\n\n${output}`);
            }
        });
    });

    let disposableRun = vscode.commands.registerCommand('autodev.run', async () => {
        provider.addResponse('🚀 AutoDev Run triggered. Sent to backend.');
        const output = await sendCommand("run", { query: "", target: "", context: {} });
        if (output) {
            provider.addResponse(`🟢 **Run Status:**\n\n${output}`);
        }
    });

    let disposableHover = vscode.languages.registerHoverProvider('*', {
        async provideHover(document, position, token) {
            const wordRange = document.getWordRangeAtPosition(position);
            const word = document.getText(wordRange);
            // Simulate lightweight inline tooltip
            if (word) {
                return new vscode.Hover(`⚡ **AutoDev:** AI context for \`${word}\``);
            }
        }
    });

    context.subscriptions.push(disposableAsk, disposableFix, disposableExplain, disposableRun, disposableHover);
}

export function deactivate() { }
