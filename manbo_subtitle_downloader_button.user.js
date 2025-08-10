// ==UserScript==
// @name         Manbo Media Downloader (Cute Pink Panel Edition - Optimized Images)
// @namespace    manbo.kilamanbo.media
// @version      3.2 // ASS conversion - no empty lines
// @description  Tải phụ đề và ảnh từ Manbo với giao diện cute hồng, trực quan và dễ sử dụng! Các tùy chọn tải xuống được đặt trong một bảng điều khiển nổi. Ảnh lấy từ API (setPic) và các phần tử DOM cụ thể.
// @author       Thien Truong Dia Cuu
// @match        https://kilamanbo.com/manbo/pc/detail*
// @match        https://manbo.kilakila.cn/manbo/pc/detail*
// @match        https://manbo.hongdoulive.com/Activecard/radioplay*
// @match        https://kilamanbo.com/*
// @match        https://www.kilamanbo.com/*
// @require      https://greasyfork.org/scripts/455943-ajaxhooker/code/ajaxHooker.js?version=1124435
// @require      https://cdn.jsdelivr.net/npm/@zip.js/zip.js/dist/zip-full.min.js
// @require      https://unpkg.com/sweetalert2@11.6.15/dist/sweetalert2.min.js
// @resource     swalStyle https://unpkg.com/sweetalert2@11.7.2/dist/sweetalert2.min.css
// @require      https://unpkg.com/layui@2.7.6/dist/layui.js
// @resource     layuiStyle https://unpkg.com/layui@2.7.6/dist/css/layui.css
// @icon         https://img.hongrenshuo.com.cn/h5/websiteManbo-pc-favicon-cb.ico
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @run-at       document-start
// @connect      img.kilamanbo.com
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    let isDownloading = false;
    let subtitleData = []; // To store subtitle info: [title, lrcUrl, setIdStr] for ALL episodes
    let currentEpisodeLrcUrl = null; // To store LRC URL of the currently viewed episode
    let imageData = [];    // To store image URLs (from current page API/DOM)
    let allDramaImageData = []; // To store ALL images from ALL episodes (from setPic)
    let currentDramaTitle = 'Manbo';
    let currentEpisodeTitle = 'Tập hiện tại'; // Default title for current episode

    // --- Custom Styles for Cute Pink Panel Edition ---
    GM_addStyle(`
        /* Main panel container */
        #manbo-downloader-panel {
            position: fixed;
            top: 20%;
            right: 20px;
            width: 280px; /* Adjusted width for better fit */
            background: linear-gradient(135deg, #ffe0ee, #fff0f6); /* Light pink gradient */
            border-radius: 15px;
            box-shadow: 0 8px 20px rgba(255, 126, 185, 0.4);
            z-index: 9999;
            font-family: 'Quicksand', sans-serif, 'Comic Sans MS';
            padding: 15px;
            box-sizing: border-box; /* Include padding in width */
            border: 1px solid #ffb3d9; /* Subtle border */
        }

        /* Panel Header */
        #manbo-downloader-panel .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px dashed #ffb3d9; /* Dashed line */
        }
        #manbo-downloader-panel .panel-title {
            color: #ff4d94;
            font-size: 1.2em;
            font-weight: bold;
            display: flex;
            align-items: center;
        }
        #manbo-downloader-panel .panel-title span {
            margin-right: 8px;
            font-size: 1.5em; /* Larger emoji */
        }
        #manbo-downloader-panel .toggle-button {
            background: none;
            border: none;
            color: #ff4d94;
            font-size: 1.5em;
            cursor: pointer;
            transition: transform 0.2s ease;
        }
        #manbo-downloader-panel .toggle-button.collapsed {
            transform: rotate(-90deg);
        }

        /* Panel Body (collapsible) */
        #manbo-downloader-panel .panel-body {
            max-height: 500px; /* Max height before scroll */
            overflow-y: auto; /* Scroll if content overflows */
            transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
            opacity: 1;
        }
        #manbo-downloader-panel.collapsed .panel-body {
            max-height: 0;
            opacity: 0;
            overflow: hidden; /* Hide overflow when collapsed */
        }

        /* Section titles */
        .panel-section-title {
            color: #d63384;
            font-weight: bold;
            margin-top: 15px;
            margin-bottom: 10px;
            font-size: 1.1em;
            display: flex;
            align-items: center;
        }
        .panel-section-title i {
            margin-right: 8px;
            font-size: 1.2em;
        }


        /* Download buttons */
        .download-option-btn {
            display: flex;
            align-items: center;
            width: 100%;
            padding: 10px 15px;
            margin-bottom: 8px;
            background: linear-gradient(135deg, #ffcce5, #ffaad5); /* Lighter pink for options */
            color: #8c004d; /* Darker pink text */
            font-weight: bold;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(255, 126, 185, 0.2);
            transition: all 0.2s ease;
            text-align: left;
            box-sizing: border-box;
        }
        .download-option-btn:hover {
            background: linear-gradient(135deg, #ffaad5, #ff8dc4);
            box-shadow: 0 4px 8px rgba(255, 126, 185, 0.3);
            transform: translateY(-2px);
        }
        .download-option-btn i {
            margin-right: 10px;
            font-size: 1.2em; /* Icon size */
            color: #ff4d94; /* Icon color */
        }
        /* Icon styles (using unicode characters for simplicity, can use actual images/svgs if preferred) */
        .icon-lrc:before { content: '💬'; }
        .icon-json-srt:before { content: '📄'; } /* Changed from document to paper */
        .icon-ass:before { content: '📝'; } /* Changed from document with pen */
        .icon-audio:before { content: '🎧'; }
        .icon-cover:before { content: '🖼️'; }
        .icon-all-images:before { content: '🎀'; } /* Ribbon for "All images" */
        .icon-single-image:before { content: '📸'; } /* New icon for single episode image */


        /* SweetAlert2 Styles (consistent pink theme) */
        .swal2-popup {
            border-radius: 20px !important;
            background: #fff0f6 !important; /* Light pink background */
            font-family: 'Quicksand', sans-serif, 'Arial' !important;
        }
        .swal2-title {
            color: #ff4d94 !important; /* Darker pink for title */
            font-weight: bold !important;
        }
        .swal2-content {
            color: #d63384 !important; /* Medium pink for content */
        }
        .swal2-styled.swal2-confirm {
            background-color: #ff7eb9 !important; /* Main button pink */
            border-radius: 20px !important;
            font-weight: bold !important;
            color: white !important;
        }
        .swal2-styled.swal2-deny {
            background-color: #ffb3d9 !important; /* Secondary button pink */
            border-radius: 20px !important;
            font-weight: bold !important;
            color: white !important;
        }
        .swal2-styled.swal2-cancel {
            background-color: #ffe0ee !important; /* Lightest pink for cancel */
            border-radius: 20px !important;
            font-weight: bold !important;
            color: #d63384 !important;
        }
        .swal2-progress-bar {
            background-color: #ff7eb9 !important; /* Pink progress bar */
        }
        .swal2-timer-progress-bar {
            background-color: #ff7eb9 !important; /* Pink timer bar */
        }
        /* Disable text selection on toasts */
        .disableSelection {
            user-select: none;
            -webkit-user-select: none;
            -moz-user-select: none;
            -ms-user-select: none;
        }
    `);

    // Load external CSS resources
    GM_addStyle(GM_getResourceText('swalStyle'));
    GM_addStyle(GM_getResourceText('layuiStyle'));

    // --- SweetAlert2 Mixin for Toasts ---
    const toast = Swal.mixin({
        toast: true,
        position: 'top',
        timer: 3000,
        timerProgressBar: true,
        didOpen: (toast) => {
            toast.addEventListener('mouseenter', Swal.stopTimer);
            toast.addEventListener('mouseleave', Swal.resumeTimer);
        },
        customClass: { container: 'disableSelection' }
    });

    // --- Utility Functions ---

    /**
     * Tracks progress of multiple Promises.
     * @param {Promise[]} proms - Array of Promises.
     * @param {(progress: number) => void} progress_cb - Callback for progress updates (0-100).
     */
    function allProgress(proms, progress_cb) {
        let done = 0;
        progress_cb(0);
        return Promise.all(proms.map(p => p.then(() => {
            done++;
            progress_cb((done * 100) / proms.length);
        })));
    }

    /**
     * Fetches a file using GM_xmlhttpRequest.
     * @param {string} url - The URL of the file.
     * @param {string} [responseType='blob'] - The desired response type.
     * @returns {Promise<Blob|string>} A Promise that resolves with the response.
     */
    const fetchFile = (url, responseType = 'blob') => new Promise((resolve, reject) => {
        if (!url) {
            return reject(new Error("Liên kết bị lỗi, vui lòng liên hệ với tác giả."));
        }
        GM_xmlhttpRequest({
            method: "GET",
            url: url,
            onload: resp => {
                if (resp.status === 200) {
                    resolve(resp.response);
                } else {
                    reject(new Error(`Lỗi tải tệp: ${resp.status} ${resp.statusText}`));
                }
            },
            onerror: () => reject(new Error("Yêu cầu mạng thất bại.")),
            responseType: responseType
        });
    });

    /**
     * Initiates a file download in the browser.
     * @param {Blob|string} data - The Blob or URL of the file to download.
     * @param {string} fileName - The desired file name.
     */
    const downloadFile = (data, fileName) => {
        const a = document.createElement("a");
        a.download = fileName;
        a.href = typeof data === "string" ? data : URL.createObjectURL(data);
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        a.remove();
        if (typeof data !== "string") {
            URL.revokeObjectURL(a.href); // Clean up the Blob URL
        }
        isDownloading = false;
    };

    /**
     * Cleans up a string for use as a filename by removing invalid characters.
     * @param {string} name - The original string.
     * @returns {string} The cleaned string.
     */
    const sanitizeFilename = (name) => {
        // Remove invalid characters for filenames: / \ ? % * : | " < >
        return name.replace(/[\/\\?%*:|"<>]/g, '_')
                   .replace(/\s+/g, ' ') // Replace multiple spaces with a single space
                   .trim(); // Trim leading/trailing spaces
    };

    /**
     * Converts LRC formatted subtitle text to ASS (Advanced SubStation Alpha) format.
     * This is a basic conversion, only handling timestamps and text.
     * @param {string} lrcText - The LRC subtitle content.
     * @returns {string} The ASS subtitle content.
     */
    function convertLrcToAss(lrcText) {
        let assContent = `[Script Info]
; Script generated by Manbo Media Downloader
Title: Converted from LRC
ScriptType: v4.00+
Collisions: Normal
PlayResX: 1280
PlayResY: 720
Timer: 100.0000

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Arial,48,&H00FFFFFF,&H000000FF,&H00000000,&H00000000,0,0,0,0,100,100,0,0,1,2,0,2,20,20,20,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

        const parsedLines = [];
        lrcText.split('\n').forEach(line => {
            // Regex to capture timestamp and the remaining text.
            const match = line.match(/^\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/);
            if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const milliseconds = parseInt(match[3]) * (match[3].length === 2 ? 10 : 1);
                const text = match[4].trim(); // Get the text part and trim it

                parsedLines.push({
                    time: minutes * 60000 + seconds * 1000 + milliseconds, // Total milliseconds
                    text: text
                });
            }
        });

        // Sort lines by time to ensure correct chronological order
        parsedLines.sort((a, b) => a.time - b.time);

        // Function to format milliseconds to ASS time format H:MM:SS.CC
        const formatAssTime = (ms) => {
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            const s = Math.floor((ms % 60000) / 1000);
            const cs = Math.floor((ms % 1000) / 10); // Centiseconds

            return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
        };

        for (let i = 0; i < parsedLines.length; i++) {
            const current = parsedLines[i];
            const next = parsedLines[i + 1];

            const startTime = current.time;
            let endTime;

            if (next) {
                // Set end time to 1 millisecond before the next line starts
                endTime = next.time - 1;
                // Ensure end time is not before start time
                if (endTime < startTime) {
                    endTime = startTime; // If next line starts immediately or before, end at start time
                }
            } else {
                // If it's the last line, give it a default duration (e.g., 5 seconds)
                endTime = startTime + 5000;
            }

            const assStartTime = formatAssTime(startTime);
            const assEndTime = formatAssTime(endTime);

            // Escape ASS special characters like '{', '}', and '\'
            const escapedText = current.text.replace(/\\/g, '\\\\').replace(/{/g, '\\{').replace(/}/g, '\\}');

            // Only add line if there's actual text content to avoid truly empty subtitle events
            // This is the line changed based on your request: `if (escapedText.length > 0)`
            if (escapedText.length > 0) {
                 assContent += `Dialogue: 0,${assStartTime},${assEndTime},Default,,0,0,0,,${escapedText}\n`;
            }
        }

        return assContent;
    }


    // --- Subtitle Downloader Logic ---

    /**
     * Starts the process of zipping and downloading subtitles.
     * @param {Array<Array<string>>} lists - Array of [title, lrcUrl, setIdStr] for subtitles.
     * @param {string} dramaTitle - The title of the radio drama.
     * @param {string} targetFormat - 'lrc' or 'ass'.
     */
    const startZipSubtitles = async (lists, dramaTitle, targetFormat) => {
        if (isDownloading) {
            return toast.fire({ title: 'Đang tải về, vui lòng chờ...', icon: 'warning' });
        }
        isDownloading = true;
        const subtitlesToDownload = lists.filter(a => a[1]); // Filter out entries without a URL
        if (subtitlesToDownload.length === 0) {
            toast.fire({ title: 'Tạm thời không có file phụ đề để tải.', icon: 'error' });
            isDownloading = false;
            return;
        }

        const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));
        toast.fire({ title: `Đang chuẩn bị phụ đề ${targetFormat.toUpperCase()}...`, icon: 'info' });

        try {
            const subtitleFetchPromises = subtitlesToDownload.map(s => fetchFile(s[1], 'text'));
            const subtitleTexts = await Promise.all(subtitleFetchPromises).catch(e => {
                throw new Error(`Lỗi tải phụ đề: ${e.message}`);
            });

            // Convert texts if targetFormat is ASS
            const processedSubtitles = subtitleTexts.map((text, i) => {
                const originalTitle = subtitlesToDownload[i][0];
                const originalUrl = subtitlesToDownload[i][1];
                let processedText = text;
                if (targetFormat === 'ass') {
                    processedText = convertLrcToAss(text);
                }
                return {
                    title: originalTitle,
                    url: originalUrl,
                    content: processedText,
                    format: targetFormat
                };
            });

            // Create CSV content
            const CSVContent = "\ufeff文件名,tải xuống liên kết\n" +
                               processedSubtitles.map(s => `${sanitizeFilename(s.title)}.${s.format},${s.url}`).join("\n") +
                               `\n\n(C) ChatGPT Script by Ne\nĐóng gói thời gian：${new Date().toISOString()}`;
            const CSVBlob = new zip.TextReader(CSVContent);

            // Add files to zip
            const addPromises = [
                zipWriter.add("filelist.csv", CSVBlob),
                ...processedSubtitles.map(s =>
                    zipWriter.add(`${sanitizeFilename(s.title)}.${s.format}`, new zip.TextReader(s.content))
                )
            ];

            // Show progress bar for zipping
            const swalProgressBar = Swal.fire({
                title: `Đang đóng gói phụ đề ${targetFormat.toUpperCase()}...`,
                html: `0% hoàn thành<br><progress id="swal-zip-progress-subtitle" max="100" value="0"></progress>`,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });

            await allProgress(addPromises, p => {
                const progressBar = document.getElementById('swal-zip-progress-subtitle');
                if (progressBar) {
                    progressBar.value = p;
                    Swal.update({
                        html: `${p.toFixed(2)}% hoàn thành<br><progress id="swal-zip-progress-subtitle" max="100" value="${p}"></progress>`
                    });
                }
            }).catch(e => {
                throw new Error(`Lỗi khi thêm tệp phụ đề vào ZIP: ${e.message}`);
            });
            swalProgressBar.then(() => Swal.close()); // Close the progress bar

            downloadFile(await zipWriter.close(), `Manbo_Subtitles_${sanitizeFilename(dramaTitle)}_${targetFormat.toUpperCase()}.zip`);
            toast.fire({ title: `Tải phụ đề ${targetFormat.toUpperCase()} hoàn tất!`, icon: 'success' });

        } catch (e) {
            toast.fire({ title: `Lỗi khi đóng gói phụ đề ${targetFormat.toUpperCase()}.`, icon: 'error', text: e.message });
            isDownloading = false;
        }
    };


    // --- Image Downloader Logic (API setPic & Specific DOM) ---

    /**
     * Extracts image URLs from specific DOM elements.
     * @returns {string[]} An array of image URLs found in specified DOM elements.
     */
    function getImagesFromSpecificDOM() {
        const urls = new Set(); // Use Set to automatically handle duplicates

        // 1. Get from background-image of div.filter-bg-image
        document.querySelectorAll('div.filter-bg-image').forEach(div => {
            const style = div.style.backgroundImage;
            if (style) {
                const match = style.match(/url\(['"]?(.*?)['"]?\)/);
                if (match && match[1]) {
                    urls.add(match[1].replace(/\?.*/, '')); // Add and remove query params
                }
            }
        });

        // 2. Get from src of img.bgimg
        document.querySelectorAll('img.bgimg').forEach(img => {
            if (img.src) {
                urls.add(img.src.replace(/\?.*/, '')); // Add and remove query params
            }
        });

        // Filter to ensure they are from kilamanbo.com if needed, though specific classes already narrow it
        return Array.from(urls).filter(url => url.includes('img.kilamanbo.com'));
    }

    /**
     * Updates the global `imageData` for the current episode.
     * This version combines new API URLs (from current episode's detail) and newly scraped DOM URLs.
     * @param {string[]} [newApiUrlsFromCurrentEpisode=[]] - New image URLs to add from API for current episode.
     */
    function updateCurrentEpisodeImageList(newApiUrlsFromCurrentEpisode = []) {
        const domUrls = getImagesFromSpecificDOM();
        imageData = [...new Set([...newApiUrlsFromCurrentEpisode, ...domUrls])];
        console.log("Current Episode Image List (API & Specific DOM):", imageData);
    }

    /**
     * Starts the process of zipping and downloading images.
     * @param {string[]} list - Array of image URLs.
     * @param {string} fileNamePrefix - Prefix for the zip file name.
     */
    const startZipImages = async (list, fileNamePrefix) => {
        if (isDownloading) {
            return toast.fire({ title: 'Đang tải về, vui lòng chờ...', icon: 'warning' });
        }
        isDownloading = true;

        if (list.length === 0) {
            toast.fire({ title: 'Không tìm thấy ảnh để tải.', icon: 'error' });
            isDownloading = false;
            return;
        }

        const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));
        toast.fire({ title: 'Đang đóng gói ảnh...', icon: 'info' });

        try {
            const imageBlobs = await Promise.all(list.map(url => fetchFile(url, 'blob'))).catch(e => {
                throw new Error(`Lỗi tải ảnh: ${e.message}`);
            });

            const addPromises = list.map((url, i) => {
                const parts = url.split('/');
                const filename = parts[parts.length - 1].split('?')[0]; // Get filename and remove query params
                return zipWriter.add(filename, new zip.BlobReader(imageBlobs[i]));
            });

            const swalProgressBar = Swal.fire({
                title: 'Đang đóng gói ảnh...',
                html: `0% hoàn thành<br><progress id="swal-zip-progress" max="100" value="0"></progress>`,
                allowOutsideClick: false,
                allowEscapeKey: false,
                showConfirmButton: false,
                willOpen: () => {
                    Swal.showLoading();
                }
            });

            await allProgress(addPromises, p => {
                const progressBar = document.getElementById('swal-zip-progress');
                if (progressBar) {
                    progressBar.value = p;
                    Swal.update({
                        html: `${p.toFixed(2)}% hoàn thành<br><progress id="swal-zip-progress" max="100" value="${p}"></progress>`
                    });
                }
            }).catch(e => {
                throw new Error(`Lỗi khi thêm tệp vào ZIP: ${e.message}`);
            });
            swalProgressBar.then(() => Swal.close()); // Close the progress bar

            downloadFile(await zipWriter.close(), `${sanitizeFilename(fileNamePrefix)}_Images.zip`);
            toast.fire({ title: 'Tải ảnh hoàn tất!', icon: 'success' });

        } catch (e) {
            toast.fire({ title: 'Lỗi khi đóng gói hoặc tải ảnh.', icon: 'error', text: e.message });
            isDownloading = false;
        }
    };

    // --- UI Panel Creation ---

    /**
     * Creates and appends the main downloader panel to the page.
     */
    function createDownloaderPanel() {
        if (document.getElementById('manbo-downloader-panel')) {
            return; // Panel already exists
        }

        const panel = document.createElement('div');
        panel.id = 'manbo-downloader-panel';

        // Panel Header
        const panelHeader = document.createElement('div');
        panelHeader.classList.add('panel-header');
        panel.appendChild(panelHeader);

        const panelTitle = document.createElement('div');
        panelTitle.classList.add('panel-title');
        panelTitle.innerHTML = '<span>💖</span> Manbo Downloader';
        panelHeader.appendChild(panelTitle);

        const toggleButton = document.createElement('button');
        toggleButton.classList.add('toggle-button');
        toggleButton.innerHTML = '▼'; // Down arrow
        panelHeader.appendChild(toggleButton);

        // Panel Body (collapsible content)
        const panelBody = document.createElement('div');
        panelBody.classList.add('panel-body');
        panel.appendChild(panelBody);

        // --- Subtitle Section ---
        const subtitleSectionTitle = document.createElement('div');
        subtitleSectionTitle.classList.add('panel-section-title');
        subtitleSectionTitle.innerHTML = '<i>🐾</i> Tải phụ đề:'; // Icon changed to paws
        panelBody.appendChild(subtitleSectionTitle);

        // Phụ đề LRC (Download all) - Assuming Lrc is the primary subtitle type for Manbo
        const btnDownloadAllLRC = document.createElement('button');
        btnDownloadAllLRC.classList.add('download-option-btn');
        btnDownloadAllLRC.innerHTML = '<i></i> Tải phụ đề LRC (Toàn bộ Drama)';
        btnDownloadAllLRC.querySelector('i').classList.add('icon-json-srt'); // Reusing icon for generic subtitle download
        panelBody.appendChild(btnDownloadAllLRC);
        btnDownloadAllLRC.onclick = () => {
            if (subtitleData.length === 0) return Swal.fire('Không có dữ liệu phụ đề', 'Bạn đã vào trang chi tiết drama chính chưa?', 'error');
            startZipSubtitles(subtitleData, currentDramaTitle, 'lrc');
        };

        // Tải phụ đề ASS (Download all) - New button
        const btnDownloadAllASS = document.createElement('button');
        btnDownloadAllASS.classList.add('download-option-btn');
        btnDownloadAllASS.innerHTML = '<i></i> Tải phụ đề ASS (Toàn bộ Drama)';
        btnDownloadAllASS.querySelector('i').classList.add('icon-ass'); // Using icon-ass
        panelBody.appendChild(btnDownloadAllASS);
        btnDownloadAllASS.onclick = () => {
            if (subtitleData.length === 0) return Swal.fire('Không có dữ liệu phụ đề', 'Bạn đã vào trang chi tiết drama chính chưa?', 'error');
            startZipSubtitles(subtitleData, currentDramaTitle, 'ass');
        };

        // Tải phụ đề LRC tập hiện tại
        const btnDownloadCurrentEpisodeLRC = document.createElement('button');
        btnDownloadCurrentEpisodeLRC.classList.add('download-option-btn');
        btnDownloadCurrentEpisodeLRC.innerHTML = '<i></i> Tải phụ đề LRC (Tập hiện tại)';
        btnDownloadCurrentEpisodeLRC.querySelector('i').classList.add('icon-lrc'); // Using icon-lrc for single subtitle
        panelBody.appendChild(btnDownloadCurrentEpisodeLRC);
        btnDownloadCurrentEpisodeLRC.onclick = async () => {
            if (isDownloading) {
                return toast.fire({ title: 'Đang tải về, vui lòng chờ...', icon: 'warning' });
            }
            if (!currentEpisodeLrcUrl) {
                return Swal.fire('Không tìm thấy phụ đề LRC', 'Hãy đảm bảo bạn đang ở trang chi tiết của một tập và phụ đề đã tải.', 'error');
            }
            isDownloading = true;
            toast.fire({ title: 'Đang tải phụ đề LRC tập hiện tại...', icon: 'info' });
            try {
                const lrcText = await fetchFile(currentEpisodeLrcUrl, 'text');
                // Use currentEpisodeTitle for the filename if available, fallback to a generic name
                const filename = `${sanitizeFilename(currentDramaTitle)}_${sanitizeFilename(currentEpisodeTitle)}.lrc`;
                downloadFile(new Blob([lrcText], { type: 'text/plain;charset=utf-8' }), filename);
                toast.fire({ title: 'Tải phụ đề LRC tập hiện tại hoàn tất!', icon: 'success' });
            } catch (e) {
                toast.fire({ title: 'Lỗi khi tải phụ đề LRC tập hiện tại.', icon: 'error', text: e.message });
            } finally {
                isDownloading = false;
            }
        };

        // Tải phụ đề ASS tập hiện tại
        const btnDownloadCurrentEpisodeASS = document.createElement('button');
        btnDownloadCurrentEpisodeASS.classList.add('download-option-btn');
        btnDownloadCurrentEpisodeASS.innerHTML = '<i></i> Tải phụ đề ASS (Tập hiện tại)';
        btnDownloadCurrentEpisodeASS.querySelector('i').classList.add('icon-ass'); // Using icon-ass
        panelBody.appendChild(btnDownloadCurrentEpisodeASS);
        btnDownloadCurrentEpisodeASS.onclick = async () => {
            if (isDownloading) {
                return toast.fire({ title: 'Đang tải về, vui lòng chờ...', icon: 'warning' });
            }
            if (!currentEpisodeLrcUrl) {
                return Swal.fire('Không tìm thấy phụ đề LRC để chuyển đổi', 'Hãy đảm bảo bạn đang ở trang chi tiết của một tập và phụ đề đã tải.', 'error');
            }
            isDownloading = true;
            toast.fire({ title: 'Đang tải và chuyển đổi phụ đề ASS...', icon: 'info' });
            try {
                const lrcText = await fetchFile(currentEpisodeLrcUrl, 'text');
                const assText = convertLrcToAss(lrcText);
                const filename = `${sanitizeFilename(currentDramaTitle)}_${sanitizeFilename(currentEpisodeTitle)}.ass`;
                downloadFile(new Blob([assText], { type: 'text/plain;charset=utf-8' }), filename);
                toast.fire({ title: 'Tải phụ đề ASS tập hiện tại hoàn tất!', icon: 'success' });
            } catch (e) {
                toast.fire({ title: 'Lỗi khi tải hoặc chuyển đổi phụ đề ASS.', icon: 'error', text: e.message });
            } finally {
                isDownloading = false;
            }
        };


        // --- Image Section ---
        const imageSectionTitle = document.createElement('div');
        imageSectionTitle.classList.add('panel-section-title');
        imageSectionTitle.innerHTML = '<i></i> Tải ảnh Drama:';
        imageSectionTitle.querySelector('i').classList.add('icon-all-images');
        panelBody.appendChild(imageSectionTitle);

        // Tải ảnh tập hiện tại
        const btnDownloadCurrentEpisodeImages = document.createElement('button');
        btnDownloadCurrentEpisodeImages.classList.add('download-option-btn');
        btnDownloadCurrentEpisodeImages.innerHTML = '<i></i> Tải ảnh tập hiện tại';
        btnDownloadCurrentEpisodeImages.querySelector('i').classList.add('icon-single-image'); // New icon
        panelBody.appendChild(btnDownloadCurrentEpisodeImages);
        btnDownloadCurrentEpisodeImages.onclick = () => {
            updateCurrentEpisodeImageList(); // Scrape DOM images one more time right before action
            if (imageData.length === 0) return Swal.fire('Không tìm thấy ảnh', 'Hãy cuộn trang hoặc chờ tải API để có thêm ảnh.', 'error');
            startZipImages(imageData, `${sanitizeFilename(currentDramaTitle)}_${sanitizeFilename(currentEpisodeTitle)}`);
        };

        // Tải TẤT CẢ ảnh Drama (toàn bộ các tập)
        const btnDownloadAllDramaImages = document.createElement('button');
        btnDownloadAllDramaImages.classList.add('download-option-btn');
        btnDownloadAllDramaImages.innerHTML = '<i></i> Tải TẤT CẢ ảnh Drama';
        btnDownloadAllDramaImages.querySelector('i').classList.add('icon-all-images');
        panelBody.appendChild(btnDownloadAllDramaImages);
        btnDownloadAllDramaImages.onclick = () => {
            if (allDramaImageData.length === 0) return Swal.fire('Không tìm thấy ảnh', 'Chưa có dữ liệu ảnh cho toàn bộ drama. Hãy đảm bảo bạn đã vào trang chi tiết drama chính.', 'warning');
            startZipImages(allDramaImageData, `${sanitizeFilename(currentDramaTitle)}_All_Drama`);
        };


        // --- Toggle Panel Functionality ---
        toggleButton.addEventListener('click', () => {
            panel.classList.toggle('collapsed');
            toggleButton.innerHTML = panel.classList.contains('collapsed') ? '►' : '▼'; // Change arrow
        });


        document.body.appendChild(panel);
    }

    // --- API Hooking for Data Collection ---
    ajaxHooker.hook(request => {
        // Intercept responses to collect subtitle and image data
        request.response = res => {
            if (res.responseText) {
                try {
                    const data = JSON.parse(res.responseText);

                    // Case 1: dramaSetDetail (detail of a specific episode) - e.g., kilamanbo.com/web_manbo/dramaSetDetail
                    // The main 'data' object itself is the episode data
                    if (request.url.includes('dramaSetDetail')) {
                        const episodeData = data?.data;
                        if (episodeData) {
                            currentEpisodeLrcUrl = episodeData.setLrcUrl || null;
                            currentEpisodeTitle = episodeData.setTitle || episodeData.setName || 'Tập hiện tại';
                            // Get overall drama title from nested radioDramaResp
                            currentDramaTitle = episodeData.radioDramaResp?.title || currentDramaTitle;

                            // Update subtitleData with all episodes from setRespList (from the nested radioDramaResp)
                            const setList = episodeData.radioDramaResp?.setRespList || [];
                            subtitleData = setList.map(a => [a.subTitle || a.setTitle || a.setName, a.setLrcUrl, a.setIdStr]);

                            // Populate allDramaImageData from setPic of each episode and drama cover
                            const uniqueAllImages = new Set();
                            setList.forEach(ep => {
                                if (ep.setPic) {
                                    uniqueAllImages.add(ep.setPic.replace(/\?.*/, ''));
                                }
                            });
                            if (episodeData.radioDramaResp?.coverPic) {
                                uniqueAllImages.add(episodeData.radioDramaResp.coverPic.replace(/\?.*/, ''));
                            }
                            allDramaImageData = Array.from(uniqueAllImages);

                            // Update current episode images from `picUrlSet` or `backgroundImgUrl` in the top-level episodeData
                            const apiImageUrls = episodeData.picUrlSet || [];
                            if (episodeData.backgroundImgUrl) {
                                apiImageUrls.push(episodeData.backgroundImgUrl);
                            }
                            updateCurrentEpisodeImageList(apiImageUrls.filter(Boolean).map(url => url.replace(/\?.*/, '')));
                        }
                    }
                    // Case 2: dramaDetail (main drama page) - e.g., kilamanbo.com/manbo/pc/detail
                    else if (request.url.includes('dramaDetail')) {
                        const radioDramaResp = data?.data?.radioDramaResp || data?.data;
                        const setList = radioDramaResp?.setRespList || [];
                        subtitleData = setList.map(a => [a.subTitle || a.setTitle || a.setName, a.setLrcUrl, a.setIdStr]);
                        currentDramaTitle = radioDramaResp?.title || 'Manbo';

                        // For dramaDetail, we typically don't have a single "current episode" LRC/title directly
                        // unless it implies the first episode or currently playing one.
                        // We'll reset these for now, assuming user will navigate to a specific episode page for direct LRC.
                        currentEpisodeLrcUrl = null; // No direct episode LRC on main drama page
                        currentEpisodeTitle = 'Tập hiện tại'; // Reset to default


                        // Populate allDramaImageData from setPic of each episode and drama cover
                        const uniqueAllImages = new Set();
                        setList.forEach(episode => {
                            if (episode.setPic) {
                                uniqueAllImages.add(episode.setPic.replace(/\?.*/, ''));
                            }
                        });
                        if (radioDramaResp?.coverPic) {
                            uniqueAllImages.add(radioDramaResp.coverPic.replace(/\?.*/, ''));
                        }
                        allDramaImageData = Array.from(uniqueAllImages);

                        // Also update current episode images if this response contains relevant image list for the current view
                        if (radioDramaResp?.backgroundImgList) {
                            const apiImageUrls = radioDramaResp.backgroundImgList.map(i => i.backPic).filter(Boolean);
                            updateCurrentEpisodeImageList(apiImageUrls);
                        } else {
                            // If no `backgroundImgList` in this response, just update from DOM
                            updateCurrentEpisodeImageList([]);
                        }
                    }
                    // For any other general image API (e.g., getBackground if it exists separately)
                    else if (data?.data?.backgroundImgList) {
                         const apiImageUrls = data.data.backgroundImgList.map(i => i.backPic).filter(Boolean);
                         updateCurrentEpisodeImageList(apiImageUrls);
                    }

                    console.log("Current Drama Title:", currentDramaTitle);
                    console.log("Current Episode Title:", currentEpisodeTitle);
                    console.log("Current Episode LRC URL:", currentEpisodeLrcUrl);
                    console.log("Subtitle Data (All Episodes):", subtitleData);
                    console.log("All Drama Image Data:", allDramaImageData);

                } catch (e) {
                    console.error("Manbo Downloader: Error parsing JSON or extracting data:", e);
                }
            }
        };
    });

    // --- Initial setup ---
    document.addEventListener('DOMContentLoaded', () => {
        // Create the panel once DOM is ready
        createDownloaderPanel();

        // Perform initial image list update for the current episode after DOM is ready
        updateCurrentEpisodeImageList();

        // Set up a MutationObserver to catch dynamically loaded images for the current episode
        const observer = new MutationObserver((mutationsList, observer) => {
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                    // Re-run updateCurrentEpisodeImageList to capture new DOM images
                    updateCurrentEpisodeImageList();
                }
            }
        });

        // Observe the body for changes (e.g., new elements being added)
        observer.observe(document.body, { childList: true, subtree: true });

        // Fallback to capture any remaining images from DOM after a short delay
        // This helps for elements that might load a bit later after initial DOM ready.
        setTimeout(() => {
            updateCurrentEpisodeImageList();
        }, 1500);
    });

})();
