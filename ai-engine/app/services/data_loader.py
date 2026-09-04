import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()


def get_database_connection():
    return psycopg2.connect(
        os.getenv("DATABASE_URL")
    )


def get_health_readings(user_id, limit=20):
    connection = get_database_connection()

    try:
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                "heartRate",
                "spo2",
                "bodyTemperature",
                "activity",
                "timestamp"
            FROM "HealthReading"
            WHERE "userId" = %s
            ORDER BY "timestamp" DESC
            LIMIT %s;
            """,
            (user_id, limit)
        )

        rows = cursor.fetchall()

        readings = []

        for row in rows:
            readings.append({
                "heartRate": row[0],
                "spo2": row[1],
                "bodyTemperature": row[2],
                "activity": row[3],
                "timestamp": row[4]
            })

        return readings

    finally:
        connection.close()