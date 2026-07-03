import os
import cv2
import time
import uuid
import threading
from ultralytics import YOLO
from config import MODELS, UPLOAD_FOLDER, RESULTS_FOLDER, DEFAULT_MODEL

# Кэш загруженных моделей
model_cache = {}
model_lock = threading.Lock()
current_model_name = DEFAULT_MODEL

def get_model(model_name):
    """Загружает и кеширует модель YOLOv8"""
    global current_model_name
    with model_lock:
        if model_name not in model_cache:
            # Если файл модели отсутствует, Ultralytics скачает его автоматически
            model_cache[model_name] = YOLO(model_name)
        current_model_name = model_name
        return model_cache[model_name]

def get_available_models():
    return list(MODELS.keys())

def allowed_file(filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    return ext in {'png', 'jpg', 'jpeg', 'bmp', 'gif', 'mp4', 'avi', 'mov', 'mkv'}

def process_image(file_path, model_name, confidence, iou):
    """Обработка изображения: детекция, визуализация, сохранение"""
    model = get_model(model_name)
    img = cv2.imread(file_path)
    if img is None:
        raise ValueError("Не удалось загрузить изображение")

    start_time = time.time()
    results = model(img, conf=confidence, iou=iou, classes=[0])  # класс 0 = человек
    processing_time = time.time() - start_time

    # Подсчёт людей
    people_count = 0
    if results and len(results) > 0:
        boxes = results[0].boxes
        if boxes is not None:
            people_count = len(boxes)

    # Визуализация
    annotated_img = results[0].plot() if results else img
    result_filename = f"result_{uuid.uuid4().hex}_{os.path.basename(file_path)}"
    result_path = os.path.join(RESULTS_FOLDER, result_filename)
    cv2.imwrite(result_path, annotated_img)

    return {
        'people_count': people_count,
        'processing_time': processing_time,
        'result_image_path': result_filename,
        'file_type': 'image'
    }

def process_video(file_path, model_name, confidence, iou):
    """Обработка видео: анализ каждого 5-го кадра, подсчёт статистики"""
    model = get_model(model_name)
    cap = cv2.VideoCapture(file_path)
    if not cap.isOpened():
        raise ValueError("Не удалось открыть видео")

    start_time = time.time()
    frame_count = 0
    people_counts = []
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        frame_count += 1
        # Анализируем каждый 5-й кадр
        if frame_count % 5 == 0:
            results = model(frame, conf=confidence, iou=iou, classes=[0])
            count = len(results[0].boxes) if results and results[0].boxes is not None else 0
            people_counts.append(count)

    cap.release()
    processing_time = time.time() - start_time

    if people_counts:
        avg_people = sum(people_counts) / len(people_counts)
        max_people = max(people_counts)
        min_people = min(people_counts)
        total_counted_frames = len(people_counts)
    else:
        avg_people = max_people = min_people = total_counted_frames = 0

    stats = {
        'avg_people': round(avg_people, 2),
        'max_people': max_people,
        'min_people': min_people,
        'total_frames': total_frames,
        'analyzed_frames': total_counted_frames
    }

    return {
        'people_count': round(avg_people),  # Для истории используем среднее
        'processing_time': processing_time,
        'file_type': 'video',
        'video_stats': stats,
        'result_image_path': None
    }