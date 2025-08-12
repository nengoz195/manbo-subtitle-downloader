// ==UserScript==
// @name         Manbo Ảnh từ API getBackground + DOM Downloader (Cute Pink Edition + Toggle UI)
// @namespace    manbo.kilamanbo.images
// @version      1.4
// @description  Giao diện cute hồng, tự động gọi API getBackground, lấy ảnh, copy link & tải zip, thêm nút ẩn/hiện UI
// @author       Ne
// @match        https://kilamanbo.com/*
// @match        https://www.kilamanbo.com/*
// @require      https://greasyfork.org/scripts/455943-ajaxhooker/code/ajaxHooker.js?version=1124435
// @require      https://cdn.jsdelivr.net/npm/@zip.js/zip.js/dist/zip-full.min.js
// @require      https://unpkg.com/sweetalert2@11.6.15/dist/sweetalert2.min.js
// @resource     swalStyle https://unpkg.com/sweetalert2@11.7.2/dist/sweetalert2.min.css
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @grant        GM_setClipboard
// @grant        GM_xmlhttpRequest
// @run-at       document-idle
// @connect      img.kilamanbo.com
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';
  let downloading = false;
  let imgList = [];
  let panelVisible = true; // trạng thái hiển thị

  // Thêm CSS
  GM_addStyle(`
    #download-img-btn {
      margin: 10px;
      padding: 10px 16px;
      background: linear-gradient(135deg, #ff9ecb, #ff7eb9);
      color: white;
      font-weight: bold;
      border: none;
      border-radius: 25px;
      cursor: pointer;
      font-family: 'Comic Sans MS', 'Quicksand', sans-serif;
      box-shadow: 0 4px 10px rgba(255, 126, 185, 0.4);
      transition: all 0.3s ease;
      z-index: 99998;
    }
    #download-img-btn:hover {
      background: linear-gradient(135deg, #ff7eb9, #ff65a3);
      transform: scale(1.05);
      box-shadow: 0 6px 14px rgba(255, 126, 185, 0.6);
    }
    #toggle-ui-btn {
      position: fixed;
      top: 10px;
      right: 10px;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #ff7eb9;
      color: white;
      font-size: 16px;
      border: none;
      cursor: pointer;
      z-index: 99999;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }
    .swal2-popup {
      border-radius: 20px !important;
      background: #fff0f6 !important;
      font-family: 'Quicksand', sans-serif;
    }
    .swal2-title {
      color: #ff4d94 !important;
      font-weight: bold;
    }
    .swal2-styled.swal2-confirm {
      background-color: #ff7eb9 !important;
      border-radius: 20px;
      font-weight: bold;
    }
    .swal2-styled.swal2-deny {
      background-color: #ffb3d9 !important;
      border-radius: 20px;
      font-weight: bold;
    }
  `);

  const alert = Swal.mixin({
    toast: true,
    position: 'top',
    timer: 3000,
    timerProgressBar: true,
    didOpen: toast => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    }
  });

  GM_addStyle(GM_getResourceText('swalStyle'));

  function allProgress(proms, cb) {
    let done = 0; cb(0);
    return Promise.all(proms.map(p => p.then(() => { done++; cb((done*100)/proms.length); })));
  }

  const fetchFile = url => new Promise((res, rej) => GM_xmlhttpRequest({
    method: "GET", url,
    onload: r => res(r.response),
    onerror: () => rej(Error("Lỗi tải ảnh")),
    responseType: 'blob'
  }));

  const downloadFile = (data, name) => {
    const a = document.createElement("a");
    a.download = name;
    a.href = URL.createObjectURL(data);
    document.body.appendChild(a);
    a.click();
    a.remove();
    downloading = false;
  };

  const startZip = async (list, title) => {
    const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));
    alert.fire({ title: 'Đang đóng gói ảnh...', icon: 'info', timer: 1000 });
    const blobs = await Promise.all(list.map(fetchFile)).catch(e => {
      alert.fire({ title: 'Tải ảnh thất bại', icon: 'error', text: e.message });
      downloading = false;
    });
    if (!blobs?.length) {
      alert.fire({ title: 'Không tìm thấy ảnh', icon: 'error' });
      downloading = false;
      return;
    }
    await allProgress(
      list.map((u, i) => zipWriter.add(`image_${i+1}.jpg`, new zip.BlobReader(blobs[i]))),
      p => console.log(`Progress: ${p.toFixed(2)}%`)
    ).catch(e => {
      alert.fire({ title: 'Lỗi đóng gói', icon: 'error', text: e.message });
      downloading = false;
    });
    downloadFile(await zipWriter.close(), `${title}_Images.zip`);
  };

  function getImagesFromDOM() {
    return [...document.querySelectorAll('img')]
      .map(img => img.src)
      .filter(s => s.includes('img.kilamanbo.com') && s.endsWith('.jpg'));
  }

  function updateImageList(arr = []) {
    imgList = [...new Set([...imgList, ...arr, ...getImagesFromDOM()])];
    console.log("Ảnh hiện tại:", imgList);
  }

  function createButton(title = 'Manbo') {
    const container = document.querySelector('.radio-info .title') || document.body;
    if (!container || document.querySelector('#download-img-btn')) return;

    // Nút tải ảnh
    const btn = document.createElement('button');
    btn.textContent = '💖 Tải ảnh 💖';
    btn.id = 'download-img-btn';
    container.appendChild(btn);

    btn.onclick = () => {
      updateImageList();
      if (!imgList.length) return Swal.fire('Không tìm thấy ảnh', '', 'error');
      if (downloading) return alert.fire({ title: 'Đang tải rồi...', icon: 'warning' });

      Swal.fire({
        title: 'Chọn hành động 💕',
        icon: 'question',
        showConfirmButton: true, confirmButtonText: '📋 Copy link',
        showDenyButton: true, denyButtonText: '📦 Tải tất cả',
      }).then(res => {
        if (res.isConfirmed) {
          GM_setClipboard(imgList.join('\n'), 'text');
          Swal.fire('Đã copy!', 'Tất cả link ảnh đã được copy 💌', 'success');
        } else if (res.isDenied) {
          downloading = true;
          startZip(imgList, title);
        }
      });
    };

    // Nút toggle ẩn/hiện
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'toggle-ui-btn';
    toggleBtn.textContent = '⚙';
    document.body.appendChild(toggleBtn);

    toggleBtn.onclick = () => {
      panelVisible = !panelVisible;
      btn.style.display = panelVisible ? '' : 'none';
    };
  }

  // Intercept API
  ajaxHooker.hook(req => {
    req.response = res => {
      if (res.responseText) {
        try {
          const data = JSON.parse(res.responseText);
          if (data?.data?.backgroundImgList) {
            const urls = data.data.backgroundImgList.map(i => i.backPic);
            updateImageList(urls);
            createButton(data?.data?.title || 'Manbo');
          }
        } catch (e) {
          createButton();
        }
      }
    };
  });

  // Tự add nút nếu API chưa gọi trong 2s
  setTimeout(() => {
    updateImageList();
    createButton('Manbo');
  }, 2000);
})();
