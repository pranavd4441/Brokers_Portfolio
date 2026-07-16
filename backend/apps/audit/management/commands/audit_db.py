from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    """
    Management command to audit database statistics, check table sizes, index scans,
    detect slow queries, and monitor vacuum schedules.
    """

    help = "Audits the database for performance metrics, indexes, slow queries, and table statistics."

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS("[PropertyOS] Starting database enterprise audit...")
        )

        db_engine = connection.settings_dict["ENGINE"]
        self.stdout.write(f"Database Engine: {db_engine}")

        if "postgresql" in db_engine:
            self.audit_postgres()
        else:
            self.audit_sqlite()

    def audit_postgres(self):
        self.stdout.write("\n=== PostgreSQL Table & Vacuum Statistics ===")
        with connection.cursor() as cursor:
            # Query table sizes and vacuum stats
            cursor.execute("""
                SELECT 
                    relname AS table_name,
                    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
                    pg_size_pretty(pg_relation_size(relid)) AS table_size,
                    pg_size_pretty(pg_total_relation_size(relid) - pg_relation_size(relid)) AS index_size,
                    n_dead_tup AS dead_rows,
                    last_vacuum,
                    last_autovacuum
                FROM pg_stat_user_tables
                ORDER BY pg_total_relation_size(relid) DESC;
            """)
            rows = cursor.fetchall()
            for row in rows:
                self.stdout.write(
                    f"Table: {row[0]:25} | Size: {row[1]:10} (Table: {row[2]:10}, Index: {row[3]:10}) | "
                    f"Dead Rows: {row[4]:5} | Last Vac/Autovac: {str(row[5])[:16]}/{str(row[6])[:16]}"
                )

        self.stdout.write("\n=== Index Usage and Coverage ===")
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    schemaname || '.' || relname AS table_name,
                    indexrelname AS index_name,
                    idx_scan AS index_scans,
                    idx_tup_read AS index_tuples_read,
                    idx_tup_fetch AS index_tuples_fetched
                FROM pg_stat_user_indexes
                ORDER BY idx_scan ASC;
            """)
            rows = cursor.fetchall()
            for row in rows:
                self.stdout.write(
                    f"Table: {row[0]:25} | Index: {row[1]:30} | Scans: {row[2]:5} | Tuples Read/Fetched: {row[3]}/{row[4]}"
                )

        self.stdout.write("\n=== Active / Slow Queries ===")
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT 
                    pid,
                    now() - query_start AS duration,
                    query,
                    state
                FROM pg_stat_activity
                WHERE state != 'idle' AND query NOT LIKE '%%pg_stat_activity%%'
                ORDER BY duration DESC
                LIMIT 5;
            """)
            rows = cursor.fetchall()
            if rows:
                for row in rows:
                    self.stdout.write(
                        f"PID: {row[0]} | Duration: {row[1]} | State: {row[3]} | Query: {row[2][:100]}"
                    )
            else:
                self.stdout.write("No active long-running queries detected.")

    def audit_sqlite(self):
        self.stdout.write("\n=== SQLite Table & Index Info ===")
        with connection.cursor() as cursor:
            # List tables
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = [row[0] for row in cursor.fetchall()]
            for table in tables:
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table};")  # nosec B608
                count = cursor.fetchone()[0]

                # Get indexes
                cursor.execute(f"PRAGMA index_list({table});")
                indexes = [row[1] for row in cursor.fetchall()]

                self.stdout.write(
                    f"Table: {table:25} | Row Count: {count:5} | Indexes: {', '.join(indexes) if indexes else 'None'}"
                )
