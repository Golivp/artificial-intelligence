import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
RESULTS_FOLDER = os.path.join(BASE_DIR, 'static', 'results')
DATABASE_PATH = os.path.join(BASE_DIR, 'analyses.db')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'bmp', 'gif', 'mp4', 'avi', 'mov', 'mkv'}

# Доступные модели YOLOv8
MODELS = {
    'yolov8n.pt': 'Nano (быстрая)',
    'yolov8s.pt': 'Small (сбалансированная)',
    'yolov8m.pt': 'Medium (точная)',
    'yolov8l.pt': 'Large (максимальная точность)'
}

# Модель по умолчанию
DEFAULT_MODEL = 'yolov8n.pt'

# Параметры детекции по умолчанию
DEFAULT_CONFIDENCE = 0.5
DEFAULT_IOU = 0.45

# Создаём необходимые папки
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(RESULTS_FOLDER, exist_ok=True)