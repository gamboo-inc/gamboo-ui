/* ==========================================================================
   gamboo UI — Showcase Scripts (ds-showcase.js)
   インタラクション状態デモ + ページ固有の26関数
   ========================================================================== */

/* --- モバイルサイドバートグル --- */
function toggleMobileSidebar() {
  var sidebar = document.querySelector('.ds-sidebar');
  var overlay = document.querySelector('.ds-sidebar-overlay');
  if (!sidebar || !overlay) return;
  var isOpen = sidebar.classList.contains('mobile-open');
  sidebar.classList.toggle('mobile-open', !isOpen);
  overlay.classList.toggle('active', !isOpen);
  document.body.style.overflow = isOpen ? '' : 'hidden';
}
/* サイドバーのナビリンククリックでモバイルメニューを閉じる */
document.addEventListener('DOMContentLoaded', function() {
  var links = document.querySelectorAll('.ds-sidebar .ds-nav-link');
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener('click', function() {
      if (window.innerWidth < 768) { toggleMobileSidebar(); }
    });
  }
});

/* --- Interaction States Demo --- */
function showState(state) {
  var keys = ['loading','empty','error','complete'];
  for (var i = 0; i < keys.length; i++) {
    var p = document.getElementById('state-' + keys[i]);
    var b = document.getElementById('state-btn-' + keys[i]);
    if (p) p.style.display = (keys[i] === state) ? 'block' : 'none';
    if (b) {
      b.style.backgroundColor = (keys[i] === state) ? '#2b70ef' : '';
      b.style.color = (keys[i] === state) ? '#fff' : '';
      b.style.borderColor = (keys[i] === state) ? '#2b70ef' : '';
    }
  }
}
function simulateAction(nextState, delay) {
  delay = delay || 1500;
  showState('loading');
  setTimeout(function () { showState(nextState); }, delay);
}
function retryReload(returnState, delay) {
  delay = delay || 1500;
  var loading = document.getElementById('state-loading');
  var target = document.getElementById('state-' + returnState);
  if (target) target.style.display = 'none';
  if (loading) loading.style.display = 'block';
  setTimeout(function () {
    if (loading) loading.style.display = 'none';
    if (target) target.style.display = 'block';
  }, delay);
}

/* --- Code Block Toggle --- */
function toggleCodeBlock(block) {
  var collapsed = block.getAttribute('data-collapsed') === 'true';
  block.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
}

/* --- Code Copy --- */
function copyCode(btn) {
  var block = btn.closest('.ds-code-block');
  if (block.getAttribute('data-collapsed') === 'true') {
    toggleCodeBlock(block);
  }
  var pre = block.querySelector('code');
  var text = pre.textContent;
  navigator.clipboard.writeText(text).then(function() {
    btn.innerHTML = '<svg class="w-3.5 h-3.5 inline-block" style="color:#34d399;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
    btn.style.color = '#34d399';
    setTimeout(function() { btn.textContent = 'Copy'; btn.style.color = ''; }, 1500);
  });
}

/* --- Copy Button Demo --- */
function demoCopyButton(btn) {
  btn.classList.add('copied');
  btn.setAttribute('aria-label', 'コピーしました');
  clearTimeout(btn._cbTimer);
  btn._cbTimer = setTimeout(function() {
    btn.classList.remove('copied');
    btn.setAttribute('aria-label', 'コピー');
  }, 2000);
}

/* --- Modal System (with focus trap) --- */
var _modalPrevFocus = null;
function openModal(id) {
  var el = document.getElementById(id);
  if (!el) return;
  _modalPrevFocus = document.activeElement;
  el.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  var focusable = _getModalFocusable(el);
  if (focusable.length) focusable[0].focus();
}
function closeModal(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.classList.add('hidden');
  document.body.style.overflow = '';
  if (_modalPrevFocus) _modalPrevFocus.focus();
}
function _getModalFocusable(el) {
  return Array.from(el.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'))
    .filter(function(f) { return !f.disabled && f.offsetParent !== null; });
}
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    ['modal-confirm','modal-form','modal-alert'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) closeModal(id);
    });
    return;
  }
  if (e.key === 'Tab') {
    var openId = ['modal-confirm','modal-form','modal-alert'].find(function(id) {
      var el = document.getElementById(id);
      return el && !el.classList.contains('hidden');
    });
    if (!openId) return;
    var modal = document.getElementById(openId);
    var focusable = _getModalFocusable(modal);
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault(); last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault(); first.focus();
    }
  }
});

/* --- Dropdown --- */
function toggleMenu(menuId, trigger) {
  var menu = document.getElementById(menuId);
  var isOpen = !menu.classList.contains('hidden');
  document.querySelectorAll('[role="menu"]').forEach(function(m) { m.classList.add('hidden'); });
  document.querySelectorAll('[aria-expanded="true"]').forEach(function(b) { b.setAttribute('aria-expanded','false'); });
  if (!isOpen) {
    menu.classList.remove('hidden');
    trigger.setAttribute('aria-expanded','true');
    var first = menu.querySelector('[role="menuitem"]:not([aria-disabled="true"])');
    if (first) first.focus();
  }
}
document.addEventListener('keydown', function(e) {
  var menu = e.target.closest('[role="menu"]');
  if (!menu) return;
  var items = Array.from(menu.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])'));
  var idx = items.indexOf(e.target);
  if (idx === -1) return;
  var newIdx = -1;
  if (e.key === 'ArrowDown') newIdx = (idx+1) % items.length;
  else if (e.key === 'ArrowUp') newIdx = (idx-1+items.length) % items.length;
  else if (e.key === 'Home') newIdx = 0;
  else if (e.key === 'End') newIdx = items.length - 1;
  else if (e.key === 'Escape') {
    var trig = document.querySelector('[aria-expanded="true"]');
    menu.classList.add('hidden');
    if (trig) { trig.setAttribute('aria-expanded','false'); trig.focus(); }
    e.preventDefault(); return;
  }
  if (newIdx >= 0) { e.preventDefault(); items[newIdx].focus(); }
});
document.addEventListener('click', function(e) {
  document.querySelectorAll('[role="menu"]:not(.hidden)').forEach(function(menu) {
    var trig = document.querySelector('[aria-expanded="true"]');
    if (!menu.contains(e.target) && (!trig || !trig.contains(e.target))) {
      menu.classList.add('hidden');
      if (trig) trig.setAttribute('aria-expanded','false');
    }
  });
});

/* --- Toast System --- */
var toastCount = 0;
function showToast(type) {
  var container = document.getElementById('toast-container');
  var configs = {
    success: { bg:'bg-emerald-50', border:'border-emerald-200', text:'text-emerald-800', icon:'text-emerald-600', close:'text-emerald-400 hover:text-emerald-600', msg:'保存しました', role:'status', live:'polite', iconPath:'<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>' },
    error: { bg:'bg-red-50', border:'border-red-200', text:'text-red-800', icon:'text-red-500', close:'text-red-400 hover:text-red-500', msg:'保存に失敗しました', role:'alert', live:'assertive', iconPath:'<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>' },
    warning: { bg:'bg-amber-50', border:'border-amber-200', text:'text-amber-800', icon:'text-amber-600', close:'text-amber-400 hover:text-amber-600', msg:'ストレージ容量が残りわずかです', role:'alert', live:'assertive', iconPath:'<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>' },
    info: { bg:'bg-primary-50', border:'border-primary-200', text:'text-primary-800', icon:'text-primary-500', close:'text-primary-400 hover:text-primary-500', msg:'新しいアップデートがあります', role:'status', live:'polite', iconPath:'<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>' }
  };
  var c = configs[type]; if (!c) return;
  toastCount++;
  var id = 'toast-' + toastCount;
  var html = '<div id="'+id+'" role="'+c.role+'" aria-live="'+c.live+'" class="pointer-events-auto flex items-center gap-3 p-4 '+c.bg+' border '+c.border+' rounded-lg shadow-sm" style="animation:toastSlideIn 300ms ease-out">' +
    '<svg class="w-6 h-6 '+c.icon+' flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">'+c.iconPath+'</svg>' +
    '<p class="flex-1 text-sm font-medium '+c.text+'">'+c.msg+'</p>' +
    '<button aria-label="閉じる" onclick="dismissToast(\''+id+'\')" class="'+c.close+' transition-colors flex-shrink-0"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg></button></div>';
  container.insertAdjacentHTML('beforeend', html);
  if (type === 'success' || type === 'info') {
    setTimeout(function() { dismissToast(id); }, 5000);
  }
  // Max 5 toasts
  while (container.children.length > 5) { container.removeChild(container.firstElementChild); }
}
function dismissToast(id) {
  var el = document.getElementById(id);
  if (!el) return;
  el.style.animation = 'toastSlideOut 300ms ease-in forwards';
  setTimeout(function() { if (el.parentNode) el.parentNode.removeChild(el); }, 300);
}

/* --- Tabs --- */
function switchTab(tabGroup, index) {
  var group = document.querySelector('[data-tab-group="'+tabGroup+'"]');
  if (!group) return;
  var tabs = group.querySelectorAll('[role="tab"]');
  var panels = group.querySelectorAll('[role="tabpanel"]');
  tabs.forEach(function(t, i) {
    var active = i === index;
    t.setAttribute('aria-selected', active ? 'true' : 'false');
    t.className = active
      ? 'text-sm font-semibold text-primary-500 border-b-2 border-primary-500 pb-3 transition-colors'
      : 'text-sm font-medium text-slate-500 border-b-2 border-transparent pb-3 hover:text-slate-700 transition-colors';
  });
  panels.forEach(function(p, i) {
    p.classList.toggle('hidden', i !== index);
  });
}

/* --- Bar Tabs --- */
function switchBarTab(tabGroup, index) {
  var group = document.querySelector('[data-tab-group="'+tabGroup+'"]');
  if (!group) return;
  var tabs = group.querySelectorAll('[role="tab"]');
  var panels = group.querySelectorAll('[role="tabpanel"]');
  var indicator = '<span style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:56px;height:4px;background:var(--color-primary-500,#2b70ef);border-radius:2px"></span>';
  tabs.forEach(function(t, i) {
    var active = i === index;
    t.setAttribute('aria-selected', active ? 'true' : 'false');
    var bar = t.querySelector('span[style]');
    if (bar) bar.remove();
    if (active) {
      t.className = 'flex-1 relative flex items-center justify-center py-4 text-sm font-semibold text-slate-900 hover:bg-slate-100 cursor-pointer transition-colors';
      t.insertAdjacentHTML('beforeend', indicator);
    } else {
      t.className = 'flex-1 relative flex items-center justify-center py-4 text-sm font-medium text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors';
    }
  });
  panels.forEach(function(p, i) {
    p.classList.toggle('hidden', i !== index);
  });
}

/* --- Accordion --- */
function toggleAccordion(btn) {
  var content = btn.nextElementSibling;
  var icon = btn.querySelector('svg');
  var expanded = btn.getAttribute('aria-expanded') === 'true';
  btn.setAttribute('aria-expanded', !expanded);
  content.classList.toggle('hidden', expanded);
  if (icon) icon.style.transform = expanded ? '' : 'rotate(180deg)';
}

/* --- Toggle Switch --- */
function toggleSwitch(btn) {
  var checked = btn.getAttribute('aria-checked') === 'true';
  btn.setAttribute('aria-checked', !checked);
  var thumb = btn.querySelector('span');
  if (!checked) {
    btn.classList.remove('bg-slate-200');
    btn.classList.add('bg-primary-500');
    thumb.style.transform = 'translateX(1.25rem)';
  } else {
    btn.classList.remove('bg-primary-500');
    btn.classList.add('bg-slate-200');
    thumb.style.transform = 'translateX(0)';
  }
}

/* --- Motion Preview --- */
function playMotion(btn, duration) {
  var box = btn.parentElement.querySelector('.motion-demo-box');
  if (!box) return;
  box.style.transform = 'translateX(60px)';
  setTimeout(function() { box.style.transform = ''; }, duration + 50);
}

/* --- Progress Animation --- */
function animateProgress(id, target) {
  var bar = document.getElementById(id);
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '0%';
  bar.offsetWidth; /* force reflow */
  bar.style.transition = 'width 600ms cubic-bezier(0.4,0,0.2,1)';
  bar.style.width = target + '%';
}

/* showState is defined above */

/* --- Emotional Feedback Demo --- */
function playFeedback(type) {
  var el = document.getElementById('feedback-' + type);
  if (!el) return;
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  if (type === 'success') el.style.animation = 'scaleCheck 400ms ease-out';
  else if (type === 'error') el.style.animation = 'shake 200ms ease-in-out 2';
  else el.style.animation = 'fadeIn 200ms ease-out';
}

/* --- Tag / Chip --- */
function removeTag(btn) {
  var tag = btn.closest('[role="listitem"]') || btn.parentElement;
  if (tag) {
    tag.style.opacity = '0';
    tag.style.transition = 'opacity 150ms ease-out';
    setTimeout(function() { if (tag.parentNode) tag.parentNode.removeChild(tag); }, 150);
  }
}

function toggleFilterChip(btn) {
  var selected = btn.getAttribute('aria-selected') === 'true';
  btn.setAttribute('aria-selected', selected ? 'false' : 'true');
  if (selected) {
    // Deactivate
    btn.classList.remove('bg-primary-50', 'border-primary-200', 'text-primary-700');
    btn.classList.add('bg-white', 'border-slate-200', 'text-slate-700', 'hover:bg-gray-50');
    var check = btn.querySelector('.ds-chip-check');
    if (check) check.remove();
  } else {
    // Activate
    btn.classList.remove('bg-white', 'border-slate-200', 'text-slate-700', 'hover:bg-gray-50');
    btn.classList.add('bg-primary-50', 'border-primary-200', 'text-primary-700');
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'w-3.5 h-3.5 ds-chip-check');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('viewBox', '0 0 24 24');
    var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    path.setAttribute('stroke-width', '2');
    path.setAttribute('d', 'M5 13l4 4L19 7');
    svg.appendChild(path);
    btn.insertBefore(svg, btn.firstChild);
  }
}

function handleTagInput(e) {
  if (e.key !== 'Enter') return;
  e.preventDefault();
  var input = e.target;
  var text = input.value.trim();
  if (!text) return;
  var container = input.parentElement;
  var tag = document.createElement('span');
  tag.setAttribute('role', 'listitem');
  tag.className = 'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700';
  var textNode = document.createTextNode(text + ' ');
  tag.appendChild(textNode);
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', text + 'を削除');
  btn.setAttribute('onclick', 'removeTag(this)');
  btn.className = 'ml-0.5 -mr-1 p-0.5 flex items-center justify-center rounded-full text-primary-400 hover:text-primary-500 hover:bg-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-colors';
  btn.innerHTML = '<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>';
  tag.appendChild(btn);
  container.insertBefore(tag, input);
  input.value = '';
}

/* --- Date Picker (Showcase) --- */
(function() {
  var dpYear, dpMonth, dpSelected = null;
  var dpToday = new Date();
  dpYear = dpToday.getFullYear();
  dpMonth = dpToday.getMonth();

  function dpRender() {
    var label = document.getElementById('showcase-dp-month');
    if (!label) return;
    label.textContent = dpYear + '\u5E74 ' + (dpMonth + 1) + '\u6708';
    var grid = document.getElementById('showcase-dp-grid');
    grid.innerHTML = '';
    var firstDay = new Date(dpYear, dpMonth, 1).getDay();
    var daysInMonth = new Date(dpYear, dpMonth + 1, 0).getDate();
    for (var i = 0; i < firstDay; i++) {
      var empty = document.createElement('div');
      empty.className = 'w-10 h-10';
      grid.appendChild(empty);
    }
    for (var d = 1; d <= daysInMonth; d++) {
      var cell = document.createElement('button');
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('type', 'button');
      cell.textContent = d;
      var isToday = (d === dpToday.getDate() && dpMonth === dpToday.getMonth() && dpYear === dpToday.getFullYear());
      var isSel = dpSelected && (d === dpSelected.getDate() && dpMonth === dpSelected.getMonth() && dpYear === dpSelected.getFullYear());
      var cls = 'w-10 h-10 inline-flex items-center justify-center text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-inset';
      if (isSel) { cls += ' bg-primary-500 text-white font-medium'; cell.setAttribute('aria-selected', 'true'); }
      else if (isToday) { cls += ' font-semibold text-primary-500 hover:bg-primary-50'; cell.setAttribute('aria-current', 'date'); }
      else { cls += ' text-slate-900 hover:bg-gray-50'; }
      cell.className = cls;
      (function(day) { cell.onclick = function() { dpSelect(dpYear, dpMonth, day); }; })(d);
      grid.appendChild(cell);
    }
  }

  function dpSelect(y, m, d) {
    dpSelected = new Date(y, m, d);
    var iso = y + '-' + String(m + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0');
    document.getElementById('showcase-dp-value').value = iso;
    var disp = document.getElementById('showcase-dp-display');
    disp.textContent = iso;
    disp.classList.remove('text-slate-500');
    disp.classList.add('text-slate-900');
    showcaseDpToggle();
  }

  window.showcaseDpToggle = function() {
    var popup = document.getElementById('showcase-dp-popup');
    var trigger = document.getElementById('showcase-dp-trigger');
    var isOpen = !popup.classList.contains('hidden');
    if (isOpen) {
      popup.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
    } else {
      popup.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      dpRender();
      setTimeout(function() {
        var focus = popup.querySelector('[aria-selected="true"]') || popup.querySelector('[aria-current="date"]') || popup.querySelector('[role="gridcell"]');
        if (focus) focus.focus();
      }, 50);
    }
  };
  window.showcaseDpPrev = function() { dpMonth--; if (dpMonth < 0) { dpMonth = 11; dpYear--; } dpRender(); };
  window.showcaseDpNext = function() { dpMonth++; if (dpMonth > 11) { dpMonth = 0; dpYear++; } dpRender(); };
  window.showcaseDpToday = function() { dpYear = dpToday.getFullYear(); dpMonth = dpToday.getMonth(); dpSelect(dpToday.getFullYear(), dpToday.getMonth(), dpToday.getDate()); };

  // Outside click
  document.addEventListener('click', function(e) {
    var wrapper = document.getElementById('showcase-dp-wrapper');
    var popup = document.getElementById('showcase-dp-popup');
    if (wrapper && popup && !wrapper.contains(e.target) && !popup.classList.contains('hidden')) {
      popup.classList.add('hidden');
      document.getElementById('showcase-dp-trigger').setAttribute('aria-expanded', 'false');
    }
  });
  // Keyboard nav in grid
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var popup = document.getElementById('showcase-dp-popup');
      if (popup && !popup.classList.contains('hidden')) {
        popup.classList.add('hidden');
        document.getElementById('showcase-dp-trigger').setAttribute('aria-expanded', 'false');
        document.getElementById('showcase-dp-trigger').focus();
        e.stopPropagation();
      }
    }
    if (!e.target.closest('#showcase-dp-grid')) return;
    var cells = Array.from(document.querySelectorAll('#showcase-dp-grid [role="gridcell"]'));
    var idx = cells.indexOf(e.target);
    if (idx === -1) return;
    var ni = -1;
    if (e.key === 'ArrowRight') ni = Math.min(idx + 1, cells.length - 1);
    else if (e.key === 'ArrowLeft') ni = Math.max(idx - 1, 0);
    else if (e.key === 'ArrowDown') ni = Math.min(idx + 7, cells.length - 1);
    else if (e.key === 'ArrowUp') ni = Math.max(idx - 7, 0);
    else if (e.key === 'PageUp') { e.preventDefault(); showcaseDpPrev(); return; }
    else if (e.key === 'PageDown') { e.preventDefault(); showcaseDpNext(); return; }
    if (ni >= 0 && ni !== idx) { e.preventDefault(); cells[ni].focus(); }
  });

  dpRender();
})();

/* --- Color Strip: Copy HEX on click --- */
function copyHex(el) {
  var hex = el.getAttribute('data-hex');
  if (navigator.clipboard) {
    navigator.clipboard.writeText(hex).then(function() {
      el.style.outline = '2px solid var(--sidebar-active-color)';
      el.style.outlineOffset = '-2px';
      setTimeout(function() { el.style.outline = ''; el.style.outlineOffset = ''; }, 600);
    });
  }
}

/* --- Empty State Variant Switcher --- */
function showEmptyVariant(variant) {
  var keys = ['no-data', 'no-results', 'first-use'];
  keys.forEach(function(k) {
    var panel = document.getElementById('empty-' + k);
    var btn = document.getElementById('empty-btn-' + k);
    if (panel) panel.style.display = (k === variant) ? 'block' : 'none';
    if (btn) {
      if (k === variant) {
        btn.style.backgroundColor = '#2b70ef';
        btn.style.color = '#fff';
        btn.style.borderColor = '#2b70ef';
      } else {
        btn.style.backgroundColor = '';
        btn.style.color = '';
        btn.style.borderColor = '';
      }
    }
  });
}

// --- バージョン同期（GAMBOO_VERSION 一元管理） ---
document.querySelectorAll('.ds-version-label').forEach(function(el) {
  el.textContent = el.textContent.replace(/v[\d.]+/, 'v' + GAMBOO_VERSION);
});
