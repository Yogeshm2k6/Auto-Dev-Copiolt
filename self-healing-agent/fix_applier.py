from command_runner import CommandRunner
from tools import logger

class FixApplier:
    """
    Safely executes suggested fixes.
    """
    def __init__(self, runner: CommandRunner):
        self.runner = runner
        
    def apply_fix(self, fix_command: str) -> bool:
        """
        Executes the fix command.
        Returns True if successful, False otherwise.
        """
        logger.info(f"Applying fix: '{fix_command}'...")
        result = self.runner.run(fix_command)
        
        if result["success"]:
            logger.info("Fix applied successfully.")
            return True
        else:
            logger.error(f"Failed to apply fix. Error: {result['stderr']}")
            return False
