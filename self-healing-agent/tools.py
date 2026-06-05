import json
import os
import logging
from typing import List, Dict, Any

# Configure simple logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - [%(levelname)s] - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger("SelfHealingAgent")

class ErrorMemory:
    """
    A simple JSON-based database to store past errors and their successful fixes.
    """
    def __init__(self, db_path: str = "error_memory.json"):
        self.db_path = db_path
        self._ensure_db_exists()

    def _ensure_db_exists(self):
        if not os.path.exists(self.db_path):
            with open(self.db_path, 'w') as f:
                json.dump([], f)

    def _load(self) -> List[Dict[str, Any]]:
        try:
            with open(self.db_path, 'r') as f:
                return json.load(f)
        except Exception:
            return []

    def _save(self, data: List[Dict[str, Any]]):
        with open(self.db_path, 'w') as f:
            json.dump(data, f, indent=4)

    def add_record(self, error_msg: str, command: str, successful_fix: str):
        data = self._load()
        data.append({
            "error_msg": error_msg,
            "original_command": command,
            "successful_fix": successful_fix
        })
        self._save(data)

    def get_related_fixes(self, error_msg: str) -> List[str]:
        """
        Simple keyword-based retrieval of past fixes.
        """
        data = self._load()
        # Find exact or partial matches
        fixes = []
        for record in data:
            if error_msg in record["error_msg"] or record["error_msg"] in error_msg:
                fixes.append(record["successful_fix"])
        return list(set(fixes))
