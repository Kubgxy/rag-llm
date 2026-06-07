# -*- coding: utf-8 -*-
import psycopg2

def list_users():
    pg_dsn = "postgresql://raguser:ragpass@localhost:5433/ragllm"
    try:
        conn = psycopg2.connect(pg_dsn)
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, email, employee_id, hrm_role FROM users")
        users = cursor.fetchall()
        print(f"Total users in Postgres: {len(users)}")
        for u in users:
            print(f"ID: {u[0]} | Username: {u[1]} | Email: {u[2]} | EmpID: {u[3]} | Role: {u[4]}")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_users()
