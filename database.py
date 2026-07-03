import sqlite3
from datetime import datetime
from config import DATABASE_PATH

def get_db_connection():
    conn = sqlite3.connect(DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS analyses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            file_type TEXT NOT NULL,
            people_count INTEGER,
            file_path TEXT,
            processing_time REAL,
            model_used TEXT,
            confidence REAL,
            iou REAL,
            result_image_path TEXT,
            video_stats TEXT
        )
    ''')
    conn.commit()
    conn.close()

def insert_analysis(file_type, people_count, file_path, processing_time,
                    model_used, confidence, iou, result_image_path=None, video_stats=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    timestamp = datetime.now().isoformat()
    cursor.execute('''
        INSERT INTO analyses 
        (timestamp, file_type, people_count, file_path, processing_time, 
         model_used, confidence, iou, result_image_path, video_stats)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (timestamp, file_type, people_count, file_path, processing_time,
          model_used, confidence, iou, result_image_path, video_stats))
    analysis_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return analysis_id

def get_all_analyses(limit=50):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT * FROM analyses ORDER BY timestamp DESC LIMIT ?
    ''', (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]

def get_analysis_by_id(analysis_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM analyses WHERE id = ?', (analysis_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None