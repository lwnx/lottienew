// 滚动淡入动画
const fadeEls = document.querySelectorAll('.feature-card, .faq-item, .showcase-left, .showcase-right');
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('fade-in');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
fadeEls.forEach(el => {
  el.classList.add('fade-init');
  observer.observe(el);
});

// FAQ折叠交互
const faqItems = document.querySelectorAll('.faq-item');
faqItems.forEach(item => {
  const q = item.querySelector('.faq-q');
  const a = item.querySelector('.faq-a');
  if (q && a) {
    q.style.cursor = 'pointer';
    a.style.maxHeight = '0px';
    a.style.overflow = 'hidden';
    a.style.transition = 'max-height 0.3s cubic-bezier(.4,0,.2,1), opacity 0.3s';
    q.addEventListener('click', () => {
      if (a.style.maxHeight === '0px') {
        a.style.maxHeight = a.scrollHeight + 'px';
        a.style.opacity = '1';
      } else {
        a.style.maxHeight = '0px';
        a.style.opacity = '0.6';
      }
    });
  }
});

// === Lottie 文件上传与预览核心逻辑 ===
(function() {
  // Layer类型映射函数
  function getLayerTypeName(ty) {
    switch (ty) {
      case 0: return 'Precomp';
      case 1: return 'Solid';
      case 2: return 'Image';
      case 3: return 'Shape';
      case 4: return 'Null';
      case 5: return 'Text';
      default: return 'Unknown';
    }
  }
  const selectBtn = document.getElementById('select-lottie-btn');
  const modal = document.getElementById('lottie-modal');
  const modalClose = document.getElementById('lottie-modal-close');
  const modalBackdrop = modal ? modal.querySelector('.modal-backdrop') : null;
  const fileInput = document.getElementById('lottie-upload');
  const previewDiv = document.getElementById('lottie-preview');
  const layersList = document.getElementById('lottie-layers-list');
  let lottieInstance = null;
  let lottieData = null;

  // 弹窗显示/隐藏
  function showModal() {
    if (modal) modal.style.display = 'flex';
    // 清空旧内容（可选）
    if (previewDiv) previewDiv.innerHTML = '';
    if (layersList) layersList.innerHTML = '';
    if (fileInput) fileInput.value = '';
    renderTextsOverview(lottieData);
  }
  function closeModal() {
    if (modal) modal.style.display = 'none';
    if (lottieInstance) {
      lottieInstance.destroy();
      lottieInstance = null;
    }
  }

  // 1. 点击按钮先弹出文件选择（不弹窗）
  if (selectBtn && fileInput) {
    selectBtn.addEventListener('click', function(e) {
      e.preventDefault();
      fileInput.click();
    });
  }
  // 2. 文件选择后再弹窗并渲染
  if (fileInput) {
    fileInput.addEventListener('change', function(e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          lottieData = JSON.parse(evt.target.result);
          // 容错：如果没有layers但assets里有layers，也兼容
          if (!Array.isArray(lottieData.layers) && Array.isArray(lottieData.assets)) {
            for (const asset of lottieData.assets) {
              if (Array.isArray(asset.layers)) {
                lottieData.layers = asset.layers;
                break;
              }
            }
          }
          // 打印调试
          console.log('LottieData:', lottieData);
          if (!Array.isArray(lottieData.layers)) {
            alert('No valid layers field found in this Lottie file. Cannot edit layers.');
            return;
          }
          showModal();
          renderLottie(lottieData);
          renderLayersList(lottieData);
          renderTextsOverview(lottieData);
        } catch (err) {
          alert('Invalid Lottie JSON file!\n' + err.message);
        }
      };
      reader.readAsText(file);
    });
  }
  // 关闭弹窗
  if (modalClose) {
    modalClose.addEventListener('click', closeModal);
  }
  if (modalBackdrop) {
    modalBackdrop.addEventListener('click', closeModal);
  }
  // ESC 键关闭
  window.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal && modal.style.display === 'flex') {
      closeModal();
    }
  });

  // 点击标题或预览区可触发文件选择
  if (previewDiv && fileInput && modal) {
    previewDiv.addEventListener('click', function() {
      fileInput.click();
    });
  }
  // 允许点击 modal-content 内的“Lottie 文件上传与预览”标题也触发上传（提升易用性）
  const modalTitle = modal ? modal.querySelector('.modal-title') : null;
  if (modalTitle && fileInput) {
    modalTitle.style.cursor = 'pointer';
    modalTitle.title = 'Click to select Lottie file';
    modalTitle.addEventListener('click', function() {
      fileInput.click();
    });
  }

  // 文案总览区块渲染
  function renderTextsOverview(lottieData) {
    const overviewDiv = document.getElementById('lottie-texts-overview');
    if (!overviewDiv) return;
    overviewDiv.innerHTML = '';
    if (!lottieData || !Array.isArray(lottieData.layers)) {
      overviewDiv.style.display = 'none';
      return;
    }
    // 收集所有文本层及所有 key 文案
    const texts = [];
    lottieData.layers.forEach((layer, layerIdx) => {
      if (layer.ty === 5 && layer.t && layer.t.d && Array.isArray(layer.t.d.k)) {
        layer.t.d.k.forEach((textKey, keyIdx) => {
          if (textKey && textKey.s && typeof textKey.s.t === 'string') {
            texts.push({
              layerIdx,
              keyIdx,
              name: layer.nm || `Layer ${layer.ind}`,
              value: textKey.s.t
            });
          }
        });
      }
    });
    if (texts.length === 0) {
      overviewDiv.style.display = 'none';
      return;
    }
    overviewDiv.style.display = '';
    // 标题
    const title = document.createElement('div');
    title.className = 'texts-overview-title';
    title.textContent = 'All editable texts overview';
    overviewDiv.appendChild(title);
    // 每个文案一行
    texts.forEach((text, idx) => {
      const row = document.createElement('div');
      row.className = 'text-edit-row';
      // label
      const label = document.createElement('span');
      label.className = 'text-edit-label';
      label.textContent = `${text.name} [key${text.keyIdx}]`;
      row.appendChild(label);
      // input
      const input = document.createElement('textarea');
      input.className = 'text-edit-input';
      input.value = text.value;
      input.rows = 1;
      input.oninput = function() {
        // 实时同步到 lottieData
        lottieData.layers[text.layerIdx].t.d.k[text.keyIdx].s.t = input.value;
        renderLottie(lottieData);
        // 同步刷新 layer 卡片内的 textarea
        renderLayersList(lottieData);
      };
      row.appendChild(input);
      overviewDiv.appendChild(row);
    });
  }

  // 3. 用 lottie-web 渲染动画
  function renderLottie(data) {
    if (!window.lottie || !previewDiv) return;
    if (lottieInstance) {
      lottieInstance.destroy();
      lottieInstance = null;
    }
    previewDiv.innerHTML = '';
    lottieInstance = window.lottie.loadAnimation({
      container: previewDiv,
      renderer: 'svg',
      loop: true,
      autoplay: true,
      animationData: data
    });
    renderTextsOverview(lottieData);
  }

  // 4. 递归渲染 layer 卡片（支持所有类型、树状结构、详细属性）
  let deletedLayersStack = [];
  const undoDeleteBtn = document.getElementById('undo-delete-btn');
  if (undoDeleteBtn) {
    undoDeleteBtn.addEventListener('click', function() {
      if (deletedLayersStack.length === 0) return;
      const last = deletedLayersStack.pop();
      // last: {layer, index}
      if (lottieData && lottieData.layers && last && typeof last.index === 'number') {
        lottieData.layers.splice(last.index, 0, last.layer);
        renderLottie(lottieData);
        renderLayersList(lottieData);
      }
      updateUndoBtnState();
    });
  }
  function updateUndoBtnState() {
    if (undoDeleteBtn) {
      undoDeleteBtn.disabled = deletedLayersStack.length === 0;
    }
  }
  function renderLayersList(data) {
    if (!layersList) return;
    layersList.innerHTML = '';
    if (!data || !Array.isArray(data.layers) || data.layers.length === 0) {
      layersList.innerHTML = '<div style="color:#b0b6c7;font-size:15px;text-align:center;">No layers found in this Lottie file.</div>';
      renderTextsOverview(lottieData);
      return;
    }
    // 构建 id->layer 映射，方便查找父子关系
    const idMap = {};
    data.layers.forEach(layer => { idMap[layer.ind] = layer; });
    const rootLayers = [];
    const childMap = {};
    data.layers.forEach(layer => {
      if (typeof layer.parent === 'number') {
        if (!childMap[layer.parent]) childMap[layer.parent] = [];
        childMap[layer.parent].push(layer);
      } else {
        rootLayers.push(layer);
      }
    });
    function renderLayerCard(layer, depth, parentArr) {
      const card = document.createElement('div');
      card.className = 'layer-card';
      card.style.marginLeft = (depth * 24) + 'px';
      // 删除按钮
      const delBtn = document.createElement('button');
      delBtn.className = 'layer-delete-btn';
      delBtn.textContent = 'Delete';
      delBtn.title = 'Delete this layer';
      delBtn.onclick = function(e) {
        e.stopPropagation();
        const idx = lottieData.layers.indexOf(layer);
        if (idx > -1) {
          deletedLayersStack.push({layer: JSON.parse(JSON.stringify(layer)), index: idx});
          lottieData.layers.splice(idx, 1);
          renderLottie(lottieData);
          renderLayersList(lottieData);
          updateUndoBtnState();
        }
      };
      card.appendChild(delBtn);
      // 标题
      const title = document.createElement('div');
      title.className = 'layer-title';
      title.textContent = layer.nm || `Layer ${layer.ind}`;
      card.appendChild(title);
      // 元信息
      const meta = document.createElement('div');
      meta.className = 'layer-meta';
      const type = document.createElement('span');
      type.className = 'layer-type';
      type.textContent = getLayerTypeName(layer.ty);
      meta.appendChild(type);
      const idSpan = document.createElement('span');
      idSpan.textContent = `id: ${layer.ind}`;
      meta.appendChild(idSpan);
      if (layer.refId) {
        const refSpan = document.createElement('span');
        refSpan.textContent = `refId: ${layer.refId}`;
        meta.appendChild(refSpan);
      }
      if (typeof layer.parent === 'number') {
        const parentSpan = document.createElement('span');
        parentSpan.textContent = `parent: ${layer.parent}`;
        meta.appendChild(parentSpan);
      }
      card.appendChild(meta);
      // 展开详细属性
      // 1. 文本层
      if (layer.ty === 5 && layer.t && Array.isArray(layer.t.d && layer.t.d.k)) {
        layer.t.d.k.forEach((textKey, keyIdx) => {
          if (textKey && textKey.s && typeof textKey.s.t === 'string') {
            const textarea = document.createElement('textarea');
            textarea.className = 'layer-text-edit';
            textarea.value = textKey.s.t;
            textarea.placeholder = 'Edit text content';
            textarea.oninput = function() {
              textKey.s.t = textarea.value;
              renderLottie(lottieData);
              renderTextsOverview(lottieData);
            };
            card.appendChild(textarea);
          }
        });
      }
      // 2. 形状层详细内容
      if (layer.ty === 3 && Array.isArray(layer.shapes)) {
        const shapeDiv = document.createElement('div');
        shapeDiv.style.marginTop = '8px';
        shapeDiv.style.fontSize = '13px';
        shapeDiv.style.color = '#444';
        shapeDiv.innerHTML = `<b>Shapes:</b> ${layer.shapes.length}`;
        layer.shapes.forEach((shape, si) => {
          const sType = shape.ty || 'unknown';
          const sName = shape.nm || `shape${si}`;
          const sInfo = `<div style='margin-left:14px;'>• <b>${sName}</b> <span style='color:#2454e6;'>[${sType}]</span></div>`;
          shapeDiv.innerHTML += sInfo;
        });
        card.appendChild(shapeDiv);
      }
      // 3. 图片层详细内容
      if (layer.ty === 2 && layer.refId) {
        const imgDiv = document.createElement('div');
        imgDiv.style.fontSize = '13px';
        imgDiv.style.color = '#444';
        imgDiv.innerHTML = `<b>Image refId:</b> ${layer.refId}`;
        card.appendChild(imgDiv);
      }
      // 4. 预合成层详细内容
      if (layer.ty === 0 && layer.refId) {
        const preDiv = document.createElement('div');
        preDiv.style.fontSize = '13px';
        preDiv.style.color = '#444';
        preDiv.innerHTML = `<b>Precomp refId:</b> ${layer.refId}`;
        card.appendChild(preDiv);
      }
      // 子层
      if (childMap[layer.ind] && childMap[layer.ind].length > 0) {
        const childrenDiv = document.createElement('div');
        childrenDiv.className = 'layer-children';
        childMap[layer.ind].forEach(childLayer => {
          childrenDiv.appendChild(renderLayerCard(childLayer, depth+1, layer));
        });
        card.appendChild(childrenDiv);
      }
      return card;
    }
    // 树状结构递归渲染
    rootLayers.forEach(layer => {
      layersList.appendChild(renderLayerCard(layer, 0, null));
    });
    renderTextsOverview(lottieData);
  }
  // 初始化撤回按钮状态
  updateUndoBtnState();

  // --- 下载功能 ---
  const downloadBtn = document.getElementById('download-lottie-btn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', function() {
      if (!lottieData) return;
      const blob = new Blob([JSON.stringify(lottieData, null, 2)], {type: 'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'edited_lottie.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    });
  }
})();

// Lottie动画预览（如有lottie-web可解锁动画）
// 示例：
// import lottie from 'https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js';
// lottie.loadAnimation({
//   container: document.querySelector('.lottie-preview'),
//   renderer: 'svg',
//   loop: true,
//   autoplay: true,
//   path: 'https://assets10.lottiefiles.com/packages/lf20_5ngs2ksb.json'
// });
