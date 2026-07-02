# Date Picker

> カレンダーポップアップによる日付選択コンポーネント仕様。
> Tailwind CSS 4

---

## 1. 原則

- **Dropdown パターン踏襲**: テキストフィールド風トリガー + ポップアップ（`dropdown.md` と同じ z-index・shadow 体系）
- **`YYYY-MM-DD` 固定**: 表示・格納ともに ISO 8601 形式（`foundations/theme.md` 準拠）
- **キーボード完全対応**: 矢印キーでの日付ナビ、Enter で選択、Escape で閉じる
- **ネイティブ不使用**: `<input type="date">` はブラウザ間で表示が不統一のため、カスタム実装する

---

## 2. 解剖

```
+─────────────────────────────────+
| [📅] 2026-03-15          [▼]   |  ← Trigger
+─────────────────────────────────+
| ◀  2026年 3月                ▶ |  ← Month Header
+---------------------------------+
| 日  月  火  水  木  金  土      |  ← Day-of-Week Header
+---------------------------------+
|                          1    2 |
|  3   4   5   6   7   8    9    |
| 10  11  12  13  14 [15]  16   |  ← Day Grid（[15]=Selected）
| 17  18  19  20  21  22   23   |
| 24  25  26  27  28  29   30   |
| 31                             |
+---------------------------------+
| [今日]                          |  ← Today Button (optional)
+---------------------------------+
```

| パーツ | 役割 | 必須 |
|--------|------|------|
| Trigger | 選択された日付を表示し、ポップアップを開くボタン | Yes |
| Hidden Input | `<input type="hidden">` でフォーム送信用の値を保持 | Yes |
| Calendar Popup | カレンダー全体を含むポップアップ | Yes |
| Month Header | 年月表示 + 前月/次月ナビゲーションボタン | Yes |
| Day-of-Week Header | 曜日ラベル行（日〜土） | Yes |
| Day Grid | 日付セルのグリッド | Yes |
| Today Button | 今日の日付に移動・選択するボタン | No |

---

## 3. パターン

### 3-1. トリガー状態

| 状態 | 説明 |
|------|------|
| Default | 未選択時はプレースホルダー表示 |
| Hover | `hover:border-slate-400` |
| Focus / Open | `ring-2 ring-primary-500/50 border-primary-500` |
| Error | `border-red-600 ring-2 ring-red-500/50` + エラーメッセージ |
| Disabled | `opacity-50 cursor-not-allowed` |

### 3-2. 日付セル状態

| 状態 | スタイル |
|------|----------|
| Default | `text-slate-900 hover:bg-gray-50` |
| Today | `font-semibold text-primary-500 hover:bg-primary-50` |
| Selected | `bg-primary-500 text-white font-medium` |
| Other Month | `text-slate-300`（表示しない、または薄く表示） |
| Disabled | `text-slate-300 cursor-not-allowed` |
| Focus | `ring-2 ring-primary-500/50 ring-inset` |

### 3-3. バリエーション

| バリエーション | 説明 |
|---------------|------|
| 基本 | トリガー + カレンダーのみ |
| 今日ボタン付き | カレンダー下部に「今日」ボタン |
| 必須 + エラー | `required` + エラーメッセージ表示 |

---

## 4. 振る舞い

### 4-1. Trigger

```
Container      : relative（ポップアップの基準）
Button         : w-full flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base
                 hover:border-slate-400 transition-colors
                 focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500
Calendar Icon  : w-5 h-5 text-slate-500 flex-shrink-0（左側、Charcoal Calendar.svg）
Text           : flex-1 text-left（選択済み: text-slate-900 / 未選択: text-slate-500）
Chevron        : w-4 h-4 text-slate-500 flex-shrink-0（右側、PullDown.svg）
```

### 4-2. Calendar Popup

```
Popup          : absolute mt-1 w-[320px] bg-white rounded-xl border border-slate-200 shadow-md z-20 p-4
```

### 4-3. Month Header

```
Container      : flex items-center justify-between mb-3
Year-Month     : text-base font-semibold text-slate-900
Nav Button     : w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors
Nav Icon       : w-4 h-4 text-slate-500（Charcoal Prev.svg / Next.svg）
```

### 4-4. Day-of-Week Header

```
Grid           : grid grid-cols-7 text-center mb-1
Cell           : text-xs font-medium text-slate-500 py-2
```

### 4-5. Day Grid

```
Grid           : grid grid-cols-7 text-center
Cell           : w-10 h-10 inline-flex items-center justify-center text-sm rounded-lg
                 transition-colors cursor-pointer
                 focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-inset

Selected       : bg-primary-500 text-white font-medium
Today          : font-semibold text-primary-500 hover:bg-primary-50
Default        : text-slate-900 hover:bg-gray-50
Disabled       : text-slate-300 cursor-not-allowed
```

### 4-6. Today Button

```
Container      : border-t border-slate-200 mt-3 pt-3
Button         : w-full text-center text-sm font-medium text-primary-500 hover:text-primary-700
                 py-1.5 rounded-lg hover:bg-primary-50 transition-colors
```

---

## 5. アクセシビリティ

| 項目 | 要件 |
|------|------|
| Trigger | `role="combobox" aria-haspopup="dialog" aria-expanded="true/false"` |
| Popup | `role="dialog" aria-label="カレンダー"` |
| Day Grid | `role="grid"` |
| Day Cell | `role="gridcell"` + `tabindex="0"`（フォーカス対象のみ） |
| Selected | `aria-selected="true"` |
| Today | `aria-current="date"` |
| Disabled | `aria-disabled="true"` |
| Month Nav | `aria-label="前の月"` / `aria-label="次の月"` |
| Label | Trigger の上に `<label>` を配置（`for` 属性で関連付け） |

### キーボード操作

| キー | 動作 |
|------|------|
| Enter / Space | トリガー: ポップアップ開閉。セル: 日付選択 |
| Escape | ポップアップを閉じてトリガーにフォーカス |
| ArrowLeft | 前日に移動 |
| ArrowRight | 翌日に移動 |
| ArrowUp | 前週に移動 |
| ArrowDown | 翌週に移動 |
| PageUp | 前月に移動 |
| PageDown | 翌月に移動 |

### 禁止事項

> 共通: `foundations/prohibited.md`「Date Picker」参照

- `<input type="date">` のネイティブ表示を使用すること
- カレンダーポップアップに `shadow-lg` 以上を使用すること（`shadow-md` を使用する）
- キーボードナビゲーションを省略すること
- 曜日ヘッダーを省略すること

---

## 6. Tailwind サンプル

> アイコンは Charcoal Icons: `Calendar.svg`（トリガー）、`Prev.svg`/`Next.svg`（月送り）。

### 6-1. HTML

```html
<div class="relative" id="dp-wrapper">
  <label for="dp-trigger" class="block text-sm font-medium text-slate-900 mb-1">日付</label>
  <button id="dp-trigger" type="button"
    role="combobox" aria-haspopup="dialog" aria-expanded="false" aria-controls="dp-popup"
    onclick="toggleDatePicker()"
    class="w-full flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base hover:border-slate-400 transition-colors focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 focus:outline-none">
    <!-- Calendar icon -->
    <svg class="w-5 h-5 text-slate-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"/>
    </svg>
    <span id="dp-display" class="flex-1 text-left text-slate-500">日付を選択</span>
    <!-- PullDown chevron -->
    <svg class="w-4 h-4 text-slate-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
    </svg>
  </button>
  <input type="hidden" id="dp-value" name="date" value="">

  <!-- Calendar Popup -->
  <div id="dp-popup" role="dialog" aria-label="カレンダー" class="hidden absolute mt-1 w-[320px] bg-white rounded-xl border border-slate-200 shadow-md z-20 p-4">
    <!-- Month Header -->
    <div class="flex items-center justify-between mb-3">
      <button type="button" aria-label="前の月" onclick="dpPrevMonth()" class="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors">
        <svg class="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/>
        </svg>
      </button>
      <span id="dp-month-label" class="text-base font-semibold text-slate-900"></span>
      <button type="button" aria-label="次の月" onclick="dpNextMonth()" class="w-8 h-8 inline-flex items-center justify-center rounded-lg hover:bg-gray-50 transition-colors">
        <svg class="w-4 h-4 text-slate-500" fill="currentColor" viewBox="0 0 24 24">
          <path d="M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/>
        </svg>
      </button>
    </div>
    <!-- Day-of-Week Header -->
    <div class="grid grid-cols-7 text-center mb-1">
      <span class="text-xs font-medium text-slate-500 py-2">日</span>
      <span class="text-xs font-medium text-slate-500 py-2">月</span>
      <span class="text-xs font-medium text-slate-500 py-2">火</span>
      <span class="text-xs font-medium text-slate-500 py-2">水</span>
      <span class="text-xs font-medium text-slate-500 py-2">木</span>
      <span class="text-xs font-medium text-slate-500 py-2">金</span>
      <span class="text-xs font-medium text-slate-500 py-2">土</span>
    </div>
    <!-- Day Grid -->
    <div id="dp-grid" role="grid" class="grid grid-cols-7 text-center">
      <!-- JS で描画 -->
    </div>
    <!-- Today Button -->
    <div class="border-t border-slate-200 mt-3 pt-3">
      <button type="button" onclick="dpSelectToday()" class="w-full text-center text-sm font-medium text-primary-500 hover:text-primary-700 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
        今日
      </button>
    </div>
  </div>
</div>
```

### 6-2. JavaScript

```html
<script>
(function() {
  var currentYear, currentMonth, selectedDate = null;
  var today = new Date();

  function init() {
    currentYear = today.getFullYear();
    currentMonth = today.getMonth();
    renderCalendar();
  }

  window.toggleDatePicker = function() {
    var popup = document.getElementById('dp-popup');
    var trigger = document.getElementById('dp-trigger');
    var isOpen = !popup.classList.contains('hidden');
    if (isOpen) {
      popup.classList.add('hidden');
      trigger.setAttribute('aria-expanded', 'false');
    } else {
      popup.classList.remove('hidden');
      trigger.setAttribute('aria-expanded', 'true');
      renderCalendar();
      // フォーカスを今日 or 選択済み日付に
      setTimeout(function() {
        var focus = popup.querySelector('[aria-selected="true"]') || popup.querySelector('[aria-current="date"]') || popup.querySelector('[role="gridcell"]:not([aria-disabled])');
        if (focus) focus.focus();
      }, 50);
    }
  };

  window.dpPrevMonth = function() {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  };

  window.dpNextMonth = function() {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  };

  window.dpSelectDate = function(year, month, day) {
    selectedDate = new Date(year, month, day);
    var iso = year + '-' + String(month + 1).padStart(2, '0') + '-' + String(day).padStart(2, '0');
    document.getElementById('dp-value').value = iso;
    document.getElementById('dp-display').textContent = iso;
    document.getElementById('dp-display').classList.remove('text-slate-500');
    document.getElementById('dp-display').classList.add('text-slate-900');
    toggleDatePicker();
  };

  window.dpSelectToday = function() {
    var t = new Date();
    currentYear = t.getFullYear();
    currentMonth = t.getMonth();
    dpSelectDate(t.getFullYear(), t.getMonth(), t.getDate());
  };

  function renderCalendar() {
    var label = document.getElementById('dp-month-label');
    label.textContent = currentYear + '年 ' + (currentMonth + 1) + '月';

    var grid = document.getElementById('dp-grid');
    grid.innerHTML = '';

    var firstDay = new Date(currentYear, currentMonth, 1).getDay();
    var daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // 空セル
    for (var i = 0; i < firstDay; i++) {
      var empty = document.createElement('div');
      empty.className = 'w-10 h-10';
      grid.appendChild(empty);
    }

    // 日付セル
    for (var d = 1; d <= daysInMonth; d++) {
      var cell = document.createElement('button');
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('type', 'button');
      cell.textContent = d;

      var isToday = (d === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear());
      var isSelected = selectedDate && (d === selectedDate.getDate() && currentMonth === selectedDate.getMonth() && currentYear === selectedDate.getFullYear());

      var cls = 'w-10 h-10 inline-flex items-center justify-center text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-inset';
      if (isSelected) {
        cls += ' bg-primary-500 text-white font-medium';
        cell.setAttribute('aria-selected', 'true');
      } else if (isToday) {
        cls += ' font-semibold text-primary-500 hover:bg-primary-50';
        cell.setAttribute('aria-current', 'date');
      } else {
        cls += ' text-slate-900 hover:bg-gray-50';
      }
      cell.className = cls;

      (function(day) {
        cell.onclick = function() { dpSelectDate(currentYear, currentMonth, day); };
      })(d);

      grid.appendChild(cell);
    }
  }

  // 外部クリックで閉じる
  document.addEventListener('click', function(e) {
    var wrapper = document.getElementById('dp-wrapper');
    var popup = document.getElementById('dp-popup');
    if (wrapper && popup && !wrapper.contains(e.target) && !popup.classList.contains('hidden')) {
      popup.classList.add('hidden');
      document.getElementById('dp-trigger').setAttribute('aria-expanded', 'false');
    }
  });

  // Escape で閉じる
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      var popup = document.getElementById('dp-popup');
      if (popup && !popup.classList.contains('hidden')) {
        popup.classList.add('hidden');
        document.getElementById('dp-trigger').setAttribute('aria-expanded', 'false');
        document.getElementById('dp-trigger').focus();
      }
    }
    // グリッド内の矢印キーナビ
    if (!e.target.closest('#dp-grid')) return;
    var cells = Array.from(document.querySelectorAll('#dp-grid [role="gridcell"]'));
    var idx = cells.indexOf(e.target);
    if (idx === -1) return;
    var newIdx = -1;
    if (e.key === 'ArrowRight') newIdx = Math.min(idx + 1, cells.length - 1);
    else if (e.key === 'ArrowLeft') newIdx = Math.max(idx - 1, 0);
    else if (e.key === 'ArrowDown') newIdx = Math.min(idx + 7, cells.length - 1);
    else if (e.key === 'ArrowUp') newIdx = Math.max(idx - 7, 0);
    else if (e.key === 'PageUp') { e.preventDefault(); dpPrevMonth(); return; }
    else if (e.key === 'PageDown') { e.preventDefault(); dpNextMonth(); return; }
    if (newIdx >= 0 && newIdx !== idx) { e.preventDefault(); cells[newIdx].focus(); }
  });

  init();
})();
</script>
```
