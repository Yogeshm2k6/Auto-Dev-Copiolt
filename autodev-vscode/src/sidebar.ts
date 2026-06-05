import * as vscode from 'vscode';
import * as http from 'http';

export class AutoDevSidebarProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'autodev.sidebarView';
    private _view?: vscode.WebviewView;

    constructor(private readonly _extensionUri: vscode.Uri) { }

    public resolveWebviewView(
        webviewView: vscode.WebviewView,
        context: vscode.WebviewViewResolveContext,
        _token: vscode.CancellationToken,
    ) {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (data) => {
            switch (data.type) {
                case 'askQuestion':
                    {
                        try {
                            const editor = vscode.window.activeTextEditor;
                            const fileContext = {
                                file: editor ? editor.document.fileName : "",
                                content: editor ? editor.document.getText() : "",
                                selection: editor ? editor.document.getText(editor.selection) : ""
                            };

                            let finalQuery = data.value;
                            if (finalQuery.toLowerCase().includes("project")) {
                                const folderName = await vscode.window.showInputBox({
                                    prompt: "You mentioned a project. What folder name should I use?",
                                    placeHolder: "e.g., my_new_app"
                                });
                                if (folderName) {
                                    finalQuery += ` (Target Folder: ${folderName})`;
                                    webviewView.webview.postMessage({ type: 'addResponse', value: `📁 Folder selected: ${folderName}` });
                                }
                            }

                            let workspaceRoot = ".";
                            if (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0) {
                                workspaceRoot = vscode.workspace.workspaceFolders[0].uri.fsPath;
                            } else if (vscode.window.activeTextEditor) {
                                const fp = vscode.window.activeTextEditor.document.uri.fsPath;
                                workspaceRoot = fp.substring(0, Math.max(fp.lastIndexOf("\\"), fp.lastIndexOf("/")));
                            }

                            webviewView.webview.postMessage({ type: 'addResponse', value: `🔍 Detected Workspace Path: ${workspaceRoot}` });
                            webviewView.webview.postMessage({ type: 'addResponse', value: "⏳ Scanning workspace & gathering context..." });

                            const payload = { query: finalQuery, target: "all", context: fileContext, workspace: workspaceRoot };
                            const postData = JSON.stringify(payload);

                            const config = vscode.workspace.getConfiguration('autodev');
                            const backendPort = config.get<number>('backendPort', 8001);

                            const options = {
                                hostname: '127.0.0.1',
                                port: backendPort,
                                path: '/api/ask',
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
                                        webviewView.webview.postMessage({ type: 'addResponse', value: result.output || 'No response from AI.' });

                                        // Permission Prompt Flow
                                        if (result.plan && (Object.keys(result.plan.patches || {}).length > 0 || (result.plan.commands || []).length > 0)) {
                                            vscode.window.showInformationMessage(
                                                "AutoDev is requesting permission to write files and run commands. Do you allow this?",
                                                "Approve", "Reject"
                                            ).then(selection => {
                                                if (selection === "Approve") {
                                                    webviewView.webview.postMessage({ type: 'addResponse', value: "⚡ Permission granted! Executing operations..." });

                                                    const applyPayload = JSON.stringify({
                                                        patches: result.plan.patches || {},
                                                        commands: result.plan.commands || [],
                                                        workspace: workspaceRoot
                                                    });
                                                    const applyOptions = {
                                                        hostname: '127.0.0.1',
                                                        port: backendPort,
                                                        path: '/api/apply',
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            'Content-Length': Buffer.byteLength(applyPayload)
                                                        }
                                                    };
                                                    const applyReq = http.request(applyOptions, (applyRes) => {
                                                        let applyBody = '';
                                                        applyRes.on('data', (c) => applyBody += c);
                                                        applyRes.on('end', () => {
                                                            try {
                                                                const applyResult = JSON.parse(applyBody);
                                                                webviewView.webview.postMessage({ type: 'addResponse', value: "✅ Execution Finished:\n\n" + applyResult.output });
                                                            } catch (e) {
                                                                webviewView.webview.postMessage({ type: 'addResponse', value: 'Error parsing execution response.' });
                                                            }
                                                        });
                                                    });
                                                    applyReq.end(applyPayload);
                                                } else {
                                                    webviewView.webview.postMessage({ type: 'addResponse', value: "❌ User canceled execution." });
                                                }
                                            });
                                        }

                                    } catch (e) {
                                        webviewView.webview.postMessage({ type: 'addResponse', value: 'Error parsing JSON response.' });
                                    }
                                });
                            });

                            req.on('error', (err) => {
                                webviewView.webview.postMessage({ type: 'addResponse', value: `Error connecting to AutoDev Backend: ${err.message}` });
                            });

                            req.write(postData);
                            req.end();
                        } catch (err: any) {
                            webviewView.webview.postMessage({ type: 'addResponse', value: `Internal Error: ${err.message}` });
                        }
                        break;
                    }
            }
        });
    }

    public addResponse(message: string) {
        if (this._view) {
            this._view.webview.postMessage({ type: 'addResponse', value: message });
            // Reveal the webview sidebar
            this._view.show?.(true);
        }
    }

    private _getHtmlForWebview(webview: vscode.Webview) {
        return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>AutoDev Copilot</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
                * { margin: 0; padding: 0; box-sizing: border-box; }
                body {
                    font-family: 'Inter', var(--vscode-font-family), sans-serif;
                    padding: 0;
                    color: #e0e0e0;
                    background: linear-gradient(160deg, #0d0d1a 0%, #1a1a2e 40%, #16213e 100%);
                    height: 100vh;
                    overflow: hidden;
                }
                .chat-container { display: flex; flex-direction: column; height: 100vh; }
                .header {
                    padding: 16px 16px 12px;
                    background: linear-gradient(135deg, rgba(138,43,226,0.15), rgba(0,200,255,0.08));
                    border-bottom: 1px solid rgba(138,43,226,0.2);
                    backdrop-filter: blur(10px);
                    display: flex; align-items: center; gap: 12px;
                }
                .header-icon {
                    width: 36px; height: 36px; border-radius: 10px;
                    background: linear-gradient(135deg, #8A2BE2, #00C8FF);
                    display: flex; align-items: center; justify-content: center;
                    font-size: 18px;
                    animation: pulse-glow 2s ease-in-out infinite;
                }
                @keyframes pulse-glow {
                    0%,100% { box-shadow: 0 0 8px rgba(138,43,226,0.4); }
                    50% { box-shadow: 0 0 20px rgba(138,43,226,0.7), 0 0 40px rgba(0,200,255,0.3); }
                }
                .header-text h2 {
                    font-size: 14px; font-weight: 700;
                    background: linear-gradient(90deg, #c084fc, #67e8f9);
                    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
                }
                .header-text span { font-size: 10px; color: #6b7280; }
                .status-dot {
                    width: 8px; height: 8px; background: #22c55e;
                    border-radius: 50%; margin-left: auto;
                    animation: blink 2s infinite;
                }
                @keyframes blink { 0%,100%{opacity:1;} 50%{opacity:0.3;} }
                .messages {
                    flex-grow: 1; overflow-y: auto;
                    padding: 16px 12px; scroll-behavior: smooth;
                }
                .messages::-webkit-scrollbar { width: 4px; }
                .messages::-webkit-scrollbar-track { background: transparent; }
                .messages::-webkit-scrollbar-thumb { background: rgba(138,43,226,0.3); border-radius: 4px; }
                .message {
                    margin-bottom: 12px; padding: 12px 14px;
                    border-radius: 12px; font-size: 12.5px; line-height: 1.6;
                    animation: slideIn 0.3s ease-out;
                    word-wrap: break-word; white-space: pre-wrap; position: relative;
                }
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .user-message {
                    background: linear-gradient(135deg, rgba(37,99,235,0.25), rgba(59,130,246,0.1));
                    border: 1px solid rgba(59,130,246,0.2);
                    border-radius: 12px 12px 4px 12px; margin-left: 24px;
                }
                .bot-message {
                    background: linear-gradient(135deg, rgba(138,43,226,0.12), rgba(88,28,135,0.08));
                    border: 1px solid rgba(138,43,226,0.15);
                    border-radius: 12px 12px 12px 4px; margin-right: 24px;
                }
                .bot-message.status-msg {
                    background: linear-gradient(135deg, rgba(34,197,94,0.1), rgba(16,185,129,0.05));
                    border: 1px solid rgba(34,197,94,0.15);
                    font-size: 11px; padding: 8px 12px; margin: 0;
                }
                .bot-message.error-msg {
                    background: linear-gradient(135deg, rgba(239,68,68,0.1), rgba(185,28,28,0.05));
                    border: 1px solid rgba(239,68,68,0.15);
                    font-size: 11px; padding: 8px 12px; margin: 0;
                }
                .typing-indicator {
                    display: none; padding: 12px 14px; margin: 0 12px 12px;
                    background: rgba(138,43,226,0.08);
                    border: 1px solid rgba(138,43,226,0.1);
                    border-radius: 12px 12px 12px 4px;
                }
                .typing-indicator.visible { display: flex; gap: 4px; align-items: center; }
                .typing-dot {
                    width: 6px; height: 6px; background: #8A2BE2;
                    border-radius: 50%; animation: typingBounce 1.4s infinite ease-in-out;
                }
                .typing-dot:nth-child(2) { animation-delay: 0.2s; }
                .typing-dot:nth-child(3) { animation-delay: 0.4s; }
                @keyframes typingBounce {
                    0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
                    40% { transform: scale(1); opacity: 1; }
                }
                .quick-actions { display: flex; gap: 6px; padding: 0 12px 8px; flex-wrap: wrap; }
                .quick-btn {
                    padding: 4px 10px; font-size: 10px;
                    background: rgba(138,43,226,0.1);
                    border: 1px solid rgba(138,43,226,0.2);
                    color: #c084fc; border-radius: 20px; cursor: pointer;
                    transition: all 0.2s; font-family: 'Inter', sans-serif;
                }
                .quick-btn:hover { background: rgba(138,43,226,0.25); transform: scale(1.05); }
                .quick-btn.active {
                    background: rgba(138,43,226,0.35);
                    border-color: #8A2BE2;
                    color: #fff;
                    box-shadow: 0 0 10px rgba(138,43,226,0.3);
                }
                .mode-badge {
                    display: flex; align-items: center; justify-content: space-between;
                    margin: 0 12px 6px; padding: 5px 12px;
                    background: linear-gradient(135deg, rgba(138,43,226,0.2), rgba(0,200,255,0.1));
                    border: 1px solid rgba(138,43,226,0.3);
                    border-radius: 8px; font-size: 10px;
                    color: #c084fc; font-weight: 600; letter-spacing: 1px;
                    animation: slideIn 0.2s ease-out;
                }
                .mode-clear {
                    background: none; border: none; color: #ef4444;
                    cursor: pointer; font-size: 12px; padding: 0 4px;
                    font-family: 'Inter', sans-serif;
                }
                .mode-clear:hover { color: #f87171; }
                .input-container {
                    padding: 12px;
                    background: linear-gradient(180deg, transparent, rgba(13,13,26,0.8));
                    border-top: 1px solid rgba(138,43,226,0.1);
                }
                .input-wrapper {
                    display: flex; gap: 8px; align-items: center;
                    background: rgba(30,30,60,0.6);
                    border: 1px solid rgba(138,43,226,0.2);
                    border-radius: 12px; padding: 4px 4px 4px 14px;
                    transition: border-color 0.3s, box-shadow 0.3s;
                }
                .input-wrapper:focus-within {
                    border-color: rgba(138,43,226,0.5);
                    box-shadow: 0 0 15px rgba(138,43,226,0.15), 0 0 30px rgba(0,200,255,0.05);
                }
                input {
                    flex-grow: 1; padding: 10px 0; border: none;
                    background: transparent; color: #e0e0e0;
                    font-family: 'Inter', sans-serif; font-size: 12.5px; outline: none;
                }
                input::placeholder { color: #4b5563; }
                button#send-btn {
                    padding: 8px 16px;
                    background: linear-gradient(135deg, #8A2BE2, #6d28d9);
                    color: #fff; border: none; border-radius: 8px; cursor: pointer;
                    font-family: 'Inter', sans-serif; font-size: 12px;
                    font-weight: 600; transition: all 0.2s;
                }
                button#send-btn:hover {
                    background: linear-gradient(135deg, #9333ea, #7c3aed);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(138,43,226,0.4);
                }
            </style>
        </head>
        <body>
            <div class="chat-container">
                <div class="header">
                    <div class="header-icon">&#9889;</div>
                    <div class="header-text">
                        <h2>AutoDev Copilot</h2>
                        <span>AI-Powered Code Assistant</span>
                    </div>
                    <div class="status-dot"></div>
                </div>
                <div class="messages" id="messages">
                    <div class="message bot-message">
                        Hey there! &#128075; I'm your <strong>AutoDev Copilot</strong>. I can build projects, fix bugs, explain code, and run your apps autonomously. What shall we create today?
                    </div>
                </div>
                <div class="typing-indicator" id="typing">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
                <div class="quick-actions">
                    <button class="quick-btn" onclick="setMode('ask', 'Describe your project...')">&#9889; New Project</button>
                    <button class="quick-btn" onclick="setMode('fix', 'Enter file or folder to fix...')">&#128295; Fix</button>
                    <button class="quick-btn" onclick="setMode('explain', 'Enter file or topic to explain...')">&#128218; Explain</button>
                    <button class="quick-btn" onclick="setMode('run', 'Enter file to run...')">&#9654; Run</button>
                </div>
                <div class="mode-badge" id="mode-badge" style="display:none;">
                    <span id="mode-label"></span>
                    <button class="mode-clear" onclick="clearMode()">&#10005;</button>
                </div>
                <div class="input-container">
                    <div class="input-wrapper">
                        <input type="text" id="chat-input" placeholder="Ask me anything... (e.g. ask build a todo app)">
                        <button id="send-btn">Send &#10148;</button>
                    </div>
                </div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const messagesDiv = document.getElementById('messages');
                const input = document.getElementById('chat-input');
                const btn = document.getElementById('send-btn');
                const typingIndicator = document.getElementById('typing');
                const modeBadge = document.getElementById('mode-badge');
                const modeLabel = document.getElementById('mode-label');
                let activeMode = '';

                function setMode(mode, placeholder) {
                    activeMode = mode;
                    input.placeholder = placeholder;
                    input.value = '';
                    input.focus();
                    modeBadge.style.display = 'flex';
                    modeLabel.textContent = mode.toUpperCase() + ' MODE';
                    // Highlight the active button
                    document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
                    event.target.classList.add('active');
                }

                function clearMode() {
                    activeMode = '';
                    input.placeholder = 'Ask me anything... (e.g. ask build a todo app)';
                    modeBadge.style.display = 'none';
                    document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
                }
                btn.addEventListener('click', () => {
                    const text = input.value.trim();
                    if(text) {
                        const fullQuery = activeMode ? activeMode + ' ' + text : text;
                        vscode.postMessage({ type: 'askQuestion', value: fullQuery });
                        appendMessage(fullQuery, 'user-message');
                        input.value = '';
                        typingIndicator.classList.add('visible');
                        clearMode();
                    }
                });
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') { btn.click(); }
                });
                window.addEventListener('message', event => {
                    const message = event.data;
                    switch (message.type) {
                        case 'addResponse':
                            typingIndicator.classList.remove('visible');
                            let extraClass = '';
                            const val = message.value || '';
                            if (val.includes('Error') || val.includes('Failed') || val.includes('error')) {
                                extraClass = ' error-msg';
                            } else if (val.includes('Detected') || val.includes('Scanning') || val.includes('Permission') || val.includes('Folder')) {
                                extraClass = ' status-msg';
                            }
                            appendMessage(val, 'bot-message' + extraClass);
                            break;
                    }
                });
                function appendMessage(text, className) {
                    const div = document.createElement('div');
                    div.className = 'message ' + className;
                    div.innerHTML = text.replace(/\\n/g, '<br>');
                    messagesDiv.appendChild(div);
                    messagesDiv.scrollTop = messagesDiv.scrollHeight;
                }
            </script>
        </body>
        </html>`;
    }
}
