import os
import sys
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
from agent import SelfHealingAgent
from tools import logger
from dotenv import load_dotenv
import colorama

def main():
    colorama.init(autoreset=True)
    load_dotenv()
    
    if not os.getenv("GROQ_API_KEY"):
        logger.warning("No GROQ_API_KEY is set in the environment or .env file.")
        print("\nPlease configure GROQ_API_KEY in the .env file.\n")
        
    agent = SelfHealingAgent()
    
    print("\n" + "="*60)
    print("🤖 Self-Healing Developer Agent V2")
    print("Commands: ask <query>, fix [file], explain [file], run [args]")
    print("="*60 + "\n")
    
    while True:
        try:
            user_input = input("\nagent> ").strip()
            if not user_input:
                continue
                
            if user_input.lower() in ['exit', 'quit']:
                print("Exiting...")
                break
                
            parts = user_input.split(' ', 1)
            cmd = parts[0].lower()
            args = parts[1] if len(parts) > 1 else ""
            
            if cmd == 'ask':
                if "project" in args.lower():
                    folder = input("📂 Enter folder name for the project: ").strip()
                    if folder:
                        args += f" (Target Folder: {folder})"
                agent.handle_ask(args)
            elif cmd == 'fix':
                agent.handle_fix(args)
            elif cmd == 'explain':
                agent.handle_explain(args)
            elif cmd == 'run':
                agent.handle_run(args)
            else:
                print("❌ Unknown command. Please use 'ask', 'fix', 'explain', or 'run'.")
                
        except KeyboardInterrupt:
            print("\nExiting...")
            break
        except Exception as e:
            logger.error(f"Agent encountered a fatal error: {e}")

if __name__ == "__main__":
    main()
