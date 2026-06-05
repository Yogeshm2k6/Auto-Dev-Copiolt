import os
from typing import List, Dict

class ProjectScanner:
    """Recursively scans the directory ignoring common build/env folders."""
    
    IGNORE_DIRS = {'.git', 'node_modules', '__pycache__', '.venv', 'venv', 'env', 'dist', 'build', '.idea', '.vscode', 'Lib', 'Scripts', 'Include'}
    IGNORE_EXTS = {'.pyc', '.pyo', '.pyd', '.so', '.dll', '.exe', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.zip', '.tar', '.gz', '.pkl', '.sqlite3', '.doc', '.vsix'}

    @classmethod
    def get_file_tree(cls, root_dir: str = ".") -> str:
        root_dir = os.path.abspath(root_dir)
        tree_str = []
        for dirpath, dirnames, filenames in os.walk(root_dir):
            # Filter directories in place
            dirnames[:] = [d for d in dirnames if d not in cls.IGNORE_DIRS and not d.startswith('.')]
            
            level = dirpath.replace(root_dir, '').count(os.sep)
            indent = ' ' * 4 * level
            basename = os.path.basename(dirpath)
            if not basename:
                basename = "."
            tree_str.append(f"{indent}{basename}/")
            sub_indent = ' ' * 4 * (level + 1)
            for f in filenames:
                if not any(f.endswith(ext) for ext in cls.IGNORE_EXTS):
                    tree_str.append(f"{sub_indent}{f}")
                    
        return "\n".join(tree_str)

    @classmethod
    def read_all_files(cls, root_dir: str = ".") -> Dict[str, str]:
        root_dir = os.path.abspath(root_dir)
        files_content = {}
        for dirpath, dirnames, filenames in os.walk(root_dir):
            dirnames[:] = [d for d in dirnames if d not in cls.IGNORE_DIRS and not d.startswith('.')]
            for f in filenames:
                if not any(f.endswith(ext) for ext in cls.IGNORE_EXTS):
                    full_path = os.path.join(dirpath, f)
                    try:
                        with open(full_path, 'r', encoding='utf-8') as file:
                            content = file.read()
                            # Avoid reading huge files implicitly
                            if len(content) < 500000: 
                                files_content[full_path] = content
                    except (UnicodeDecodeError, PermissionError):
                        continue
        return files_content

    @classmethod
    def format_project_context(cls, root_dir: str = ".") -> str:
        tree = cls.get_file_tree(root_dir)
        contents = cls.read_all_files(root_dir)
        
        context = f"Project Tree:\n{tree}\n\nFile Contents:\n"
        for path, content in contents.items():
            # For simplicity, strip absolute paths down to relative for token savings
            rel_path = os.path.relpath(path, root_dir)
            context += f"\n--- {rel_path} ---\n{content}\n"
        return context
