"""Atomic SQLite checkpoints, including ledger, event history, and tick state."""

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path

from backend.engine import Economy


class Store:
    def __init__(self, path):
        self.path = str(path)
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as connection:
            connection.execute("PRAGMA journal_mode=WAL")
            connection.execute("CREATE TABLE IF NOT EXISTS worlds (id TEXT PRIMARY KEY, state TEXT NOT NULL)")

    @contextmanager
    def connection(self):
        connection = sqlite3.connect(self.path, timeout=30)
        try:
            with connection:
                yield connection
        finally:
            connection.close()

    def create(self, world):
        with self.connection() as connection:
            connection.execute("INSERT INTO worlds VALUES (?, ?)",
                               (world.state["simulation_id"], json.dumps(world.state)))

    @staticmethod
    def load(connection, simulation_id):
        row = connection.execute("SELECT state FROM worlds WHERE id = ?", (simulation_id,)).fetchone()
        if row is None:
            raise KeyError(simulation_id)
        return Economy(json.loads(row[0]))

    def get(self, simulation_id):
        with self.connection() as connection:
            return self.load(connection, simulation_id)

    def mutate(self, simulation_id, operation):
        # Lock before reading, so concurrent requests cannot lose an update.
        # Any exception rolls back the complete operation.
        with self.connection() as connection:
            connection.execute("BEGIN IMMEDIATE")
            world = self.load(connection, simulation_id)
            result = operation(world)
            world.audit()
            connection.execute("UPDATE worlds SET state = ? WHERE id = ?",
                               (json.dumps(world.state), simulation_id))
            return result
