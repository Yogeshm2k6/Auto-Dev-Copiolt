class ErrorParser:
    """
    Responsible for extracting and parsing error messages from command output.
    """
    
    @staticmethod
    def extract_error(stderr: str, stdout: str) -> str:
        """
        Extracts the most relevant error information.
        Prefers stderr, but will fall back to stdout if stderr is empty.
        
        Args:
            stderr: The standard error output
            stdout: The standard output
            
        Returns:
            The extracted error string.
        """
        if stderr and stderr.strip():
            # Most modern tools put errors in stderr
            return stderr.strip()
            
        if stdout and ("Error" in stdout or "Exception" in stdout or "Traceback" in stdout):
            # Sometimes errors leak into stdout
            # A simple heuristic is to extract relevant lines
            lines = stdout.splitlines()
            error_lines = [
                line for line in lines 
                if "Error" in line or "Exception" in line or "Traceback" in line
            ]
            if error_lines:
                return "\n".join(error_lines)
                
            return stdout.strip() # fallback to all of stdout
            
        return "Unknown error occurred (no stderr/stdout captured)."
    
    @staticmethod
    def identify_error_type(error_msg: str) -> str:
        """
        A simple heuristic to classify common error types.
        """
        if "ModuleNotFoundError" in error_msg or "ImportError" in error_msg or "Cannot find module" in error_msg:
            return "Missing Dependency"
        elif "SyntaxError" in error_msg or "Unexpected token" in error_msg:
            return "Syntax Error"
        elif "is not defined" in error_msg or "NameError" in error_msg:
            return "Undefined Variable"
        elif "npm ERR!" in error_msg or "not found" in error_msg.lower():
            return "Environment/Command Error"
        elif "git" in error_msg.lower() or "fatal" in error_msg.lower():
            return "Git Error"
        else:
            return "Generic Error"
