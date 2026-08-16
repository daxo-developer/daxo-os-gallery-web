document.addEventListener("DOMContentLoaded", () => {
    // Укажите данные вашего репозитория на GitHub
    const REPO_OWNER = "daxo-developer"; // Ваш GitHub username
    const REPO_NAME = "daxo-os-gallery-web";   // Название вашего репозитория с сайтом
    const FOLDER_PATH = "assets/images";       // Путь к папке со скриншотами

    const grid = document.querySelector(".gallery-grid");

    // Функция извлечения точного времени из названия файла IMG_YYYYMMDD_HHMMSS
    function extractTimestamp(filename) {
        const match = filename.match(/IMG_(\d{8})_(\d{6})/);
        if (match) {
            const dateStr = match[1]; // YYYYMMDD
            const timeStr = match[2]; // HHMMSS
            const iso = `${dateStr.slice(0,4)}-${dateStr.slice(4,6)}-${dateStr.slice(6,8)}T${timeStr.slice(0,2)}:${timeStr.slice(2,4)}:${timeStr.slice(4,6)}`;
            return new Date(iso).getTime();
        }
        return 0; // Если имя файла другое, ставим в начало
    }

    // Красивое форматирование даты для подписи
    function formatDate(filename) {
        const match = filename.match(/IMG_(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/);
        if (match) {
            return `${match[3]}.${match[2]}.${match[1]} — ${match[4]}:${match[5]}`;
        }
        return "Development Phase";
    }

    // Автоматическое определение категории по названию или ключевым словам (можно настроить)
    function detectCategory(filename) {
        const lower = filename.toLowerCase();
        if (lower.includes("boot") || lower.includes("bios")) return "boot";
        if (lower.includes("memory") || lower.includes("page")) return "memory";
        if (lower.includes("driver") || lower.includes("ata") || lower.includes("fs")) return "drivers";
        if (lower.includes("user") || lower.includes("task") || lower.includes("async")) return "userspace";
        return "code"; // Дефолтная категория для остальных
    }

    // Главная функция загрузки файлов из репозитория
    async function loadGalleryFromGitHub() {
        try {
            grid.innerHTML = `<p style="text-align: center; color: #9ba1a6; grid-column: 1/-1; padding: 40px;">Loading ${80}+ screenshots from repository...</p>`;

            const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${FOLDER_PATH}`);
            if (!response.ok) throw new Error("Failed to fetch repository contents");

            const files = await response.json();

            // Фильтруем только изображения
            const imageFiles = files.filter(file => file.type === "file" && /\.(jpg|jpeg|png|webp)$/i.test(file.name));

            // Превращаем файлы в объекты данных
            let screenshots = imageFiles.map(file => {
                return {
                    file: file.name,
                    download_url: file.download_url, // Прямая ссылка на файл от GitHub
                    timestamp: extractTimestamp(file.name),
                    category: detectCategory(file.name),
                    title: `Build Snapshot (${file.name.slice(4, 12)})`,
                    desc: formatDate(file.name)
                };
            });

            // Жесткая хронологическая сортировка по таймстампу (от старых к новым)
            screenshots.sort((a, b) => a.timestamp - b.timestamp);

            // Рендерим галерею
            renderGallery(screenshots, "all");
            initFilters(screenshots);

        } catch (error) {
            console.error("GitHub API Error:", error);
            grid.innerHTML = `<p style="text-align: center; color: #e94560; grid-column: 1/-1;">Error loading images. Make sure repository is public and names match GitHub API.</p>`;
        }
    }

    // Отрисовка карточек на странице
    function renderGallery(items, filter) {
        grid.innerHTML = "";

        const filteredItems = filter === "all" ? items : items.filter(item => item.category === filter);

        if (filteredItems.length === 0) {
            grid.innerHTML = `<p style="text-align: center; color: #9ba1a6; grid-column: 1/-1;">No screenshots found in this category.</p>`;
            return;
        }

        filteredItems.forEach(item => {
            const card = document.createElement("div");
            card.className = "gallery-item";
            card.setAttribute("data-category", item.category);

            card.innerHTML = `
                <div class="img-wrapper">
                    <img src="${item.download_url}" alt="${item.title}" loading="lazy">
                </div>
                <div class="item-info">
                    <span class="tag ${item.category}">${item.category.toUpperCase()}</span>
                    <h3>${item.title}</h3>
                    <p class="date">${item.desc}</p>
                </div>
            `;

            grid.appendChild(card);
        });

        initLightbox();
    }

    // Настройка кнопок фильтрации
    function initFilters(screenshots) {
        const filterButtons = document.querySelectorAll(".filter-btn");
        filterButtons.forEach(btn => {
            // Удаляем старые обработчики клонированием
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.addEventListener("click", () => {
                document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
                newBtn.classList.add("active");
                renderGallery(screenshots, newBtn.getAttribute("data-filter"));
            });
        });
    }

    // Лайтбокс (увеличение по клику)
    function initLightbox() {
        const lightbox = document.getElementById("lightbox");
        const lightboxImg = document.getElementById("lightbox-img");
        const lightboxCaption = document.getElementById("lightbox-caption");
        const closeBtn = document.querySelector(".close-btn");

        document.querySelectorAll(".img-wrapper img").forEach(img => {
            img.addEventListener("click", (e) => {
                lightbox.style.display = "flex";
                lightboxImg.src = e.target.src;
                const card = e.target.closest(".gallery-item");
                const title = card.querySelector("h3").innerText;
                const desc = card.querySelector(".date").innerText;
                lightboxCaption.innerText = `${title} — ${desc}`;
            });
        });

        const closeLightbox = () => { lightbox.style.display = "none"; };
        closeBtn.addEventListener("click", closeLightbox);
        lightbox.addEventListener("click", (e) => { if (e.target === lightbox) closeLightbox(); });
        document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLightbox(); });
    }

    // Запуск загрузки
    loadGalleryFromGitHub();
});

