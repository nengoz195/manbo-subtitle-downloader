
// ==UserScript==
// @name         Manbo 字幕批量下载器（带按钮）
// @namespace    manbo.kilamanbo.subs
// @version      1.1
// @description  漫播字幕一键下载与复制链接功能，带按钮界面操作，更直观方便！
// @author       ChatGPT@Ne
// @match        https://kilamanbo.com/manbo/pc/detail*
// @match        https://manbo.kilakila.cn/manbo/pc/detail*
// @match        https://manbo.hongdoulive.com/Activecard/radioplay*
// @match        https://kilamanbo.com/Activecard/episode*
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
  let downloading = false;

  const alert = Swal.mixin({
    toast: true,
    position: 'top',
    timer: 3000,
    timerProgressBar: true,
    didOpen: toast => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
    customClass: { container: 'disableSelection' }
  });

  GM_addStyle(GM_getResourceText('swalStyle'));
  GM_addStyle(GM_getResourceText('layuiStyle'));

  function allProgress(proms, progress_cb) {
    let d = 0;
    progress_cb(0);
    return Promise.all(proms.map(p => p.then(() => {
      d++;
      progress_cb((d * 100) / proms.length);
    })));
  }

  const fetchFile = async (op) => new Promise((resolve, reject) => {
    if (!op.u) reject(Error("链接错误，请联系作者"));
    GM_xmlhttpRequest({
      method: "get",
      url: op.u,
      onload: resp => resolve(resp.response),
      onerror: () => reject(Error("网络请求失败")),
      responseType: 'blob'
    });
  });

  const downloadFile = (data, title) => {
    const name = `Manbo_Subtitles_${title}.zip`;
    const a = document.createElement("a");
    a.download = name;
    a.href = typeof data === "string" ? data : URL.createObjectURL(data);
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    a.remove();
    downloading = false;
  };

  const startZip = async (lists, title) => {
    const zipWriter = new zip.ZipWriter(new zip.BlobWriter("application/zip"));
    alert.fire({ title: '正在准备下载...', icon: 'info', timer: 1000 });

    const bloblists = await Promise.all(lists.map(a => fetchFile({ u: a[1], n: a[0] }))).catch(e => {
      alert.fire({ title: '文件请求失败', icon: 'error', text: e.message });
      downloading = false;
    });

    if (!bloblists || !bloblists.length) {
      alert.fire({ title: '暂无字幕文件', icon: 'error' });
      downloading = false;
      return;
    }

    const CSVBlob = new zip.TextReader(
      "\ufeff文件名,下载链接\n" +
      lists.map(a => `${a[0]},${a[1]}`).join("\n") +
      `\n\n(C) ChatGPT Script by Ne\n打包时间：${new Date().toISOString()}`
    );

    await allProgress([
      zipWriter.add("filelist.csv", CSVBlob),
      ...lists.map((a, i) => zipWriter.add(a[0] + ".lrc", new zip.BlobReader(bloblists[i])))
    ], p => console.log(`Progress: ${p.toFixed(2)}%`)).catch(e => {
      alert.fire({ title: '打包出错', icon: 'error', text: e.message });
      downloading = false;
    });

    downloadFile(await zipWriter.close(), title);
  };

  let d = [];
  ajaxHooker.hook(request => {
    if (request.url.includes('dramaSetDetail') || request.url.includes('dramaDetail')) {
      request.response = res => {
        const data = JSON.parse(res.responseText);
        const setList = data?.data?.radioDramaResp?.setRespList || data?.data?.setRespList || [];
        d = setList.map(a => [a.subTitle || a.setTitle, a.setLrcUrl, a.setIdStr]);
        const title = data?.data?.radioDramaResp?.title || data?.data?.title || 'Manbo';

        setTimeout(() => {
          const header = document.querySelector('.radio-info .title');
          if (!header) return;
          if (!document.querySelector('#download-subs-btn')) {
            const btn = document.createElement('button');
            btn.textContent = '📥 下载字幕';
            btn.id = 'download-subs-btn';
            btn.style.cssText = 'margin-left: 20px; padding: 4px 10px; font-size: 14px; background-color: #4caf50; color: white; border: none; border-radius: 6px; cursor: pointer;';
            header.appendChild(btn);

            btn.onclick = () => {
              if (d.length === 0) return Swal.fire('数据获取失败', '暂无数据', 'error');
              if (downloading) return alert.fire({ title: '请等待下载完成', icon: 'error' });
              alert.fire({
                title: '请选择操作',
                icon: 'question',
                showConfirmButton: true,
                confirmButtonText: '复制全部链接',
                showDenyButton: true,
                denyButtonText: '全部打包下载',
                denyButtonColor: '#4caf50',
              }).then(result => {
                if (result.isConfirmed) {
                  GM_setClipboard(d.map(x => x[1] + '#' + x[0]).join('\n'), 'text');
                  Swal.fire('复制成功', '已复制全部链接', 'success');
                } else if (result.isDenied) {
                  downloading = true;
                  startZip(d.filter(x => x[1]), title);
                }
              });
            };
          }
        }, 1000);
      };
    }
  });
})();
