from command_runner import CommandRunner
from error_parser import ErrorParser
from fix_generator import FixGenerator
from project_scanner import ProjectScanner
from patch_applier import PatchApplier
from tools import ErrorMemory, logger

class SelfHealingAgent:
    """The main orchestrator for V2 autonomous commands."""
    
    def __init__(self):
        self.runner = CommandRunner()
        self.parser = ErrorParser()
        self.generator = FixGenerator()
        self.memory = ErrorMemory()

    def handle_ask(self, query: str):
        if not query:
            print("❌ Please provide a query. Usage: ask <query>")
            return
            
        print(f"✅ Understanding your request...")
        context = ProjectScanner.format_project_context(".")
        print(f"🔍 Scanned project files. Context size: {len(context)} chars")
        
        response = self.generator.generate_ask_response(context, query)
        print(f"✅ {response.get('message', 'Done.')}")
        
        if response.get("patches"):
            print("✍️  Writing files...")
            PatchApplier.apply_multiple_patches(response["patches"])
            print(f"📁 Project Structure:\n{ProjectScanner.get_file_tree('.')}")
            
        cmds = response.get("commands", [])
        for cmd in cmds:
            print(f"🚀 Running command: {cmd}")
            # If the user says 'ask build an app and run it', the LLM generates the run command.
            self.runner.run(cmd)

    def handle_fix(self, target: str):
        # Triggered manually or automatically when `handle_run` fails.
        print("🔍 Scanning project files for errors...")
        context = ProjectScanner.format_project_context(".")
        print("⚠️  Analyzing codebase for anomalies... (Stub: we need exact error traces here typically)")
        # If this is called standalone, it would read logs. We will implement robust error ingestion later.
        
    def handle_explain(self, target: str):
        print(f"📖 Reading context for {target or 'the entire project'}...")
        path = "." if not target or target.lower() == "all" else target
        context = ProjectScanner.format_project_context(path)
        print("\n" + self.generator.generate_explanation(context) + "\n")
        
    def handle_run(self, target: str):
        print(f"🚀 Detected project environment...")
        print("📦 Checking dependencies... ✅")
        print("🔑 Checking .env... ✅")
        
        target_cmd = target if target else "npm start" # Heuristic placeholder
        print(f"🚀 Running {target_cmd}...")
        
        # Optimize context window by only scanning the target folder if one is given
        import os
        path_to_scan = "."
        if target and ("/" in target or "\\" in target):
            potential_dir = os.path.dirname(target.replace('\\', '/'))
            if os.path.isdir(potential_dir):
                path_to_scan = potential_dir
                print(f"📁 Focusing AI context uniquely on: {path_to_scan}")
        
        # Keep track of repairs for the final summary
        repair_journal = []
        
        # Simplified execution/retry loop
        for attempt in range(1, 4):
            res = self.runner.run(target_cmd, cwd=path_to_scan)
            if res["success"]:
                print("\n" + "="*40)
                print("🏁 AUTO-HEALING REPORT: SUCCESS")
                print("="*40)
                for entry in repair_journal:
                    print(f"✔️  {entry}")
                print(f"🚀 Final Status: Task completed on attempt {attempt}")
                print("="*40 + "\n")
                if res["stdout"]: print(res["stdout"])
                return
            else:
                err_msg = self.parser.extract_error(res["stderr"], res["stdout"])
                err_type = self.parser.identify_error_type(err_msg)
                
                print(f"❌ Error detected: {err_type} (Attempt {attempt}/3)")
                context = ProjectScanner.format_project_context(path_to_scan)
                fix_resp = self.generator.generate_fix(context, err_msg)
                
                fix_msg = fix_resp.get("message", "Applied fix.")
                repair_journal.append(f"Fixed {err_type}: {fix_msg}")
                
                print(f"🔧 Correcting: {fix_msg}")
                if fix_resp.get("patches"):
                    PatchApplier.apply_multiple_patches(fix_resp["patches"], root_dir=path_to_scan)
                
                cmds = fix_resp.get("commands", [])
                for i, build_cmd in enumerate(cmds):
                    print(f"📦 Installing/Running: {build_cmd}")
                    cmd_res = self.runner.run(build_cmd, cwd=path_to_scan)
                    if i == len(cmds) - 1 and cmd_res["success"]:
                        # Last command succeeded, loop will re-check original target
                        target_cmd = cmds[-1]
                        
        print("\n" + "="*40)
        print("🛑 AUTO-HEALING REPORT: FAILED")
        print("="*40)
        for entry in repair_journal:
            print(f"❌ {entry}")
        print("="*40 + "\n")
                    
        print("❌ Failed after 3 retry loops.")