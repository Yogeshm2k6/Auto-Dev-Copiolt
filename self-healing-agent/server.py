from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import sys
import io
import os
import asyncio
from agent import SelfHealingAgent
import uvicorn
from contextlib import redirect_stdout
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AutoDev Copilot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize environment
load_dotenv()

# Initialize agent once
agent = SelfHealingAgent()

class CommandRequest(BaseModel):
    query: str = ""
    target: str = ""
    context: dict = {}
    workspace: str = "."

from project_scanner import ProjectScanner
from patch_applier import PatchApplier

@app.post("/api/ask")
async def ask(request: CommandRequest):
    print(f"INFO: Received /api/ask. Workspace: {request.workspace}")
    # Just generate the plan and return it to the UI (No auto-execution)
    context = ProjectScanner.format_project_context(request.workspace)
    response = agent.generator.generate_ask_response(context, request.query)
    
    # Restoring the missing output variable
    output = f"Plan Created: {response.get('message', '')}\n\n"
    if response.get("patches"):
        output += f"Proposed modifying {len(response['patches'])} files.\n"
    if response.get("commands"):
        output += f"Proposed running {len(response['commands'])} commands.\n"
        
    return {"status": "success", "output": output, "plan": response, "workspace": request.workspace}

class ApplyRequest(BaseModel):
    patches: dict = {}
    commands: list = []
    workspace: str = "."

@app.post("/api/apply")
async def apply(request: ApplyRequest):
    print(f"INFO: Received /api/apply. Workspace: {request.workspace}")
    f = io.StringIO()
    with redirect_stdout(f):
        if request.patches:
            print(f"Applying files to root: {os.path.abspath(request.workspace)}")
            PatchApplier.apply_multiple_patches(request.patches, root_dir=request.workspace)
        if request.commands:
            for cmd in request.commands:
                print(f"Running command: {cmd} in {request.workspace}")
                agent.runner.run(cmd, cwd=request.workspace)
    return {"status": "success", "output": f.getvalue()}

@app.post("/api/fix")
async def fix(request: CommandRequest):
    print(f"INFO: Received /api/fix. Workspace: {request.workspace}")
    f = io.StringIO()
    with redirect_stdout(f):
        agent.handle_fix(request.workspace)
    output = f.getvalue()
    return {"status": "success", "output": output}

@app.post("/api/explain")
async def explain(request: CommandRequest):
    print(f"INFO: Received /api/explain. Workspace: {request.workspace}")
    f = io.StringIO()
    with redirect_stdout(f):
        agent.handle_explain(request.target or request.workspace)
    output = f.getvalue()
    return {"status": "success", "output": output}

@app.post("/api/run")
async def run_project(request: CommandRequest):
    print(f"INFO: Received /api/run. Workspace: {request.workspace}")
    f = io.StringIO()
    with redirect_stdout(f):
        agent.handle_run(request.target or request.workspace)
    output = f.getvalue()
    return {"status": "success", "output": output}

if __name__ == "__main__":
    uvicorn.run("server:app", host="127.0.0.1", port=8001, reload=False)
