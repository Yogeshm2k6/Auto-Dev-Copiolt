import subprocess
import time
from typing import Dict, Any

class CommandRunner:
    """
    Executes developer commands and captures output and errors.
    """
    
    def run(self, command: str, cwd: str = ".") -> Dict[str, Any]:
        """
        Runs a shell command and returns the execution result.
        
        Args:
            command: The command string to execute
            cwd: The directory to run the command in
            
        Returns:
            Dictionary containing exactly:
            - command: the command run
            - stdout: standard output
            - stderr: standard error
            - return_code: integer exit code
            - execution_time: float time taken
            - success: boolean indicating if return_code was 0
        """
        start_time = time.time()
        try:
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=cwd
            )
            
            stdout, stderr = process.communicate()
            return_code = process.returncode
            
        except Exception as e:
            stdout = ""
            stderr = str(e)
            return_code = 1
            
        end_time = time.time()
        
        return {
            "command": command,
            "stdout": stdout,
            "stderr": stderr,
            "return_code": return_code,
            "execution_time": end_time - start_time,
            "success": return_code == 0
        }
