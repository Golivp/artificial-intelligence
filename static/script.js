document.addEventListener('DOMContentLoaded', function() {
    // Элементы DOM
    const fileInput = document.getElementById('fileInput');
    const filePreview = document.getElementById('filePreview');
    const analyzeBtn = document.getElementById('analyzeBtn');
    const spinner = document.getElementById('spinner');
    const resultContainer = document.getElementById('resultContainer');
    const resultBody = document.getElementById('resultBody');
    const historyBody = document.getElementById('historyBody');
    const refreshHistoryBtn = document.getElementById('refreshHistoryBtn');

    // Настройки
    const modelSelect = document.getElementById('modelSelect');
    const modelDesc = document.getElementById('modelDesc');
    const confidenceSlider = document.getElementById('confidenceSlider');
    const confidenceVal = document.getElementById('confidenceVal');
    const iouSlider = document.getElementById('iouSlider');
    const iouVal = document.getElementById('iouVal');

    // --- Загрузка списка моделей ---
    async function loadModels() {
        try {
            const res = await fetch('/get_models');
            const data = await res.json();
            modelSelect.innerHTML = '';
            for (const [name, desc] of Object.entries(data.models)) {
                const option = document.createElement('option');
                option.value = name;
                option.textContent = name.replace('.pt', '').toUpperCase();
                option.dataset.desc = desc;
                if (name === data.current) option.selected = true;
                modelSelect.appendChild(option);
            }
            updateModelDesc();
        } catch (e) {
            console.error('Ошибка загрузки моделей:', e);
        }
    }

    function updateModelDesc() {
        const selected = modelSelect.options[modelSelect.selectedIndex];
        modelDesc.textContent = selected ? selected.dataset.desc : '';
    }
    modelSelect.addEventListener('change', updateModelDesc);

    // --- Превью файла ---
    fileInput.addEventListener('change', function() {
        const file = this.files[0];
        if (!file) {
            filePreview.innerHTML = '<i class="bi bi-file-earmark-image" style="font-size: 4rem; color: #ccc;"></i><p class="text-muted">Файл не выбран</p>';
            analyzeBtn.disabled = true;
            return;
        }

        const fileType = file.type.split('/')[0];
        const reader = new FileReader();
        reader.onload = function(e) {
            let previewHtml = '';
            if (fileType === 'image') {
                previewHtml = `<img src="${e.target.result}" alt="Preview" class="img-fluid">`;
            } else if (fileType === 'video') {
                previewHtml = `<video controls class="img-fluid"><source src="${e.target.result}" type="${file.type}">Ваш браузер не поддерживает видео</video>`;
            } else {
                previewHtml = `<i class="bi bi-file-earmark" style="font-size: 4rem; color: #ccc;"></i><p class="text-muted">Неизвестный тип</p>`;
            }
            filePreview.innerHTML = previewHtml;
            analyzeBtn.disabled = false;
        };
        if (fileType === 'image') {
            reader.readAsDataURL(file);
        } else if (fileType === 'video') {
            reader.readAsDataURL(file);
        } else {
            filePreview.innerHTML = `<i class="bi bi-file-earmark" style="font-size: 4rem; color: #ccc;"></i><p class="text-muted">Неизвестный тип</p>`;
            analyzeBtn.disabled = false;
        }
    });

    // --- Обновление значений слайдеров ---
    confidenceSlider.addEventListener('input', () => {
        confidenceVal.textContent = parseFloat(confidenceSlider.value).toFixed(2);
    });
    iouSlider.addEventListener('input', () => {
        iouVal.textContent = parseFloat(iouSlider.value).toFixed(2);
    });

    // --- Анализ файла ---
    analyzeBtn.addEventListener('click', async function() {
        const file = fileInput.files[0];
        if (!file) return;

        // Блокируем кнопку и показываем спиннер
        this.disabled = true;
        spinner.classList.remove('d-none');
        resultContainer.classList.add('d-none');

        const formData = new FormData();
        formData.append('file', file);
        formData.append('model', modelSelect.value);
        formData.append('confidence', confidenceSlider.value);
        formData.append('iou', iouSlider.value);

        try {
            const res = await fetch('/process', {
                method: 'POST',
                body: formData
            });
            if (!res.ok) {
                const err = await res.json();
                alert('Ошибка: ' + (err.error || 'Неизвестная ошибка'));
                return;
            }
            const data = await res.json();
            displayResult(data);
            loadHistory(); // обновляем историю
        } catch (e) {
            alert('Ошибка соединения с сервером');
            console.error(e);
        } finally {
            this.disabled = false;
            spinner.classList.add('d-none');
        }
    });

    // --- Отображение результата ---
    function displayResult(data) {
        resultContainer.classList.remove('d-none');
        let html = `<p><strong>Обнаружено людей:</strong> ${data.people_count}</p>`;
        html += `<p><strong>Время обработки:</strong> ${data.processing_time.toFixed(2)} сек</p>`;
        html += `<p><strong>Модель:</strong> ${data.model_used}</p>`;
        html += `<p><strong>Уверенность:</strong> ${data.confidence}, <strong>IOU:</strong> ${data.iou}</p>`;

        if (data.file_type === 'image' && data.result_image_url) {
            html += `<img src="${data.result_image_url}" class="img-fluid mt-2" alt="Результат">`;
        }
        if (data.file_type === 'video' && data.video_stats) {
            const s = data.video_stats;
            html += `<hr><h6>Статистика видео:</h6>
                    <ul>
                        <li>Среднее кол-во людей: ${s.avg_people}</li>
                        <li>Максимум: ${s.max_people}</li>
                        <li>Минимум: ${s.min_people}</li>
                        <li>Анализировано кадров: ${s.analyzed_frames} из ${s.total_frames}</li>
                    </ul>`;
        }
        // Кнопки для скачивания отчётов
        html += `<hr>
                <div class="d-flex gap-2">
                    <a href="/report/pdf/${data.analysis_id}" class="btn btn-outline-danger btn-sm"><i class="bi bi-file-pdf"></i> PDF</a>
                    <a href="/report/excel/${data.analysis_id}" class="btn btn-outline-success btn-sm"><i class="bi bi-file-excel"></i> Excel</a>
                </div>`;
        resultBody.innerHTML = html;
    }

    // --- Загрузка истории ---
    async function loadHistory() {
        try {
            const res = await fetch('/history');
            const data = await res.json();
            if (data.length === 0) {
                historyBody.innerHTML = '<p class="text-muted text-center">История пуста</p>';
                return;
            }
            let html = `<div class="list-group">`;
            data.forEach(item => {
                const date = new Date(item.timestamp);
                const dateStr = date.toLocaleString('ru-RU');
                html += `<div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center">
                            <div>
                                <strong>#${item.id}</strong> ${dateStr}<br>
                                <span class="badge bg-secondary">${item.file_type}</span>
                                Людей: <span class="badge bg-primary">${item.people_count}</span>
                                Модель: ${item.model_used}
                            </div>
                            <div>
                                <a href="/report/pdf/${item.id}" class="btn btn-sm btn-outline-danger"><i class="bi bi-file-pdf"></i></a>
                                <a href="/report/excel/${item.id}" class="btn btn-sm btn-outline-success"><i class="bi bi-file-excel"></i></a>
                            </div>
                        </div>`;
            });
            html += `</div>`;
            historyBody.innerHTML = html;
        } catch (e) {
            console.error('Ошибка загрузки истории:', e);
        }
    }

    refreshHistoryBtn.addEventListener('click', loadHistory);

    // --- Инициализация ---
    loadModels();
    loadHistory();
});