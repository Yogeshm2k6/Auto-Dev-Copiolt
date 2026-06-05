import os
from tools import logger

class PatchApplier:
    """Applies patches autonomous to the filesystem."""
    
    @classmethod
    def apply_patch(cls, relative_path: str, new_content: str, root_dir: str = "."):
        # Securely build the path against the requested root directory!
        base_path = os.path.abspath(root_dir)
        full_path = os.path.abspath(os.path.join(base_path, relative_path))
        
        # Security against path traversal
        if not full_path.startswith(base_path):
            logger.error(f"Path traversal detected! {full_path}")
            return False

        try:
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "w", encoding="utf-8") as f:
                f.write(new_content)
            print(f"  ✅ Modified {full_path}")
            return True
        except Exception as e:
            print(f"  ❌ Failed to modify {full_path}: {e}")
            return False

    @classmethod
    def apply_multiple_patches(cls, patches: dict, root_dir: str = "."):
        """
        Takes a dict of { filepath: new_content }.
        Returns True if all applied successfully.
        """
        success = True
        for path, content in patches.items():
            if not PatchApplier.apply_patch(path, content, root_dir):
                success = False
        return success
