# 表計算ソフト互換の基本編集体験 — ギャップ分析と実装案

> 目的: Clea の基本編集体験を Excel / Google スプレッドシートと揃える。
> 特に「複数行・複数列を選択してまとめて削除／挿入」を実現し、
> **確認ダイアログを廃し、全操作を Undo 可能・履歴から復帰可能にする**ことで、
> 破壊的操作でも確認なしに安心して行える設計にする。

---

## 1. 設計の三本柱（本提案の背骨）

ユーザー要望の中核は「確認ダイアログを不要にする」こと。これを単なる削除ではなく、
**安全に確認レスを成立させるための設計**として定義する。

1. **確認レス (No Confirm)** — 編集操作に確認ダイアログを出さない。破壊的操作も即実行する。
2. **全操作 Undo 可能 (Fully Undoable)** — すべての編集操作が履歴に1件として積まれ、`Cmd/Ctrl+Z` で確実に戻せる。
3. **履歴から復帰 (Time Travel)** — 操作履歴をパネルで可視化し、任意の地点へワンクリックで戻れる。

> 「確認ダイアログ」= 事前の不可逆性の保険。これを「事後にいつでも戻せる履歴」に置き換えることで、
> 操作のテンポを損なわずに安全性を担保する。これは Excel / スプレッドシートの実際の挙動と一致する
> （両ソフトとも行・列削除に確認を出さず、Undo で戻す前提）。

### 実装状況（このブランチ）

- ✅ **フェーズ 0**: 履歴アクションへのラベル自動付与（`describeHistoryAction`）、`addToHistory` の整理
- ✅ **フェーズ 1**: 複数行・列の選択（`Shift`+ヘッダークリック）と一括削除／挿入
  （`Cmd/Ctrl + -`・コンテキストメニュー、確認ダイアログなし）
- ✅ **フェーズ 2**: 操作履歴パネル（ツールバー「History」→ 任意地点へ復帰 `jumpToHistory`）
- ✅ 付随修正: 新規データ読み込み時（`setData`）に前ファイルの履歴・選択をクリア
- ✅ **フェーズ 3**: type-to-edit（印字文字で編集開始・内容置換）、セル右クリックメニュー
  （`CellContextMenu`）、列名変更のインライン化（モーダル廃止）、ナビゲーション拡充
  （Home/End・Cmd/Ctrl+Home/End・PageUp/PageDown）、貼り付けの行・列自動拡張、
  オートフィル（`Cmd/Ctrl+D` 下方向フィル ＋ フィルハンドルのドラッグ）
- ⬜ 未着手: 非連続マルチレンジ選択（A-3）、系列オートフィル（連番/日付の推定）、
  挿入貼り付け（D-2）、カットのマーチングアンツ（D-3）

> 非連続マルチレンジ（A-3）は `selectedRange` 単一前提の描画・コピー・統計・削除を
> 配列対応へ書き換える大規模改修で、GUI での回帰確認が前提となるため本ラウンドでは見送り。
> `selections: CsvSelection[]` への段階移行として別途計画する。

以降は当初の提案内容（背景・設計根拠・将来計画）を記録として残す。

---

## 2. 現状分析

### 2.1 実装済みの機能

| カテゴリ | 実装済み内容 | 実装箇所 |
|----------|--------------|----------|
| セル選択 | 単一セル選択、範囲選択（Shift+クリック / Shift+矢印） | `csvStore.selectCell/extendSelection`, `CsvTable.handleCellClick` |
| 行/列選択 | **1行/1列のみ**の選択（ヘッダークリック） | `csvStore.selectRow/selectColumn` |
| 全選択 | `Cmd/Ctrl+A`、左上「#」クリック | `csvStore.selectAll` |
| セル編集 | ダブルクリック / `Enter` / `F2`、`Enter`=下へ / `Tab`=右へ / `Esc`=取消 | `CsvTable.handleEditKeyDown` |
| クリップボード | コピー/カット/ペースト（システムクリップボードへ TSV 連携） | `csvStore.copySelection/cutSelection/paste` |
| 内容削除 | `Delete`/`Backspace` で選択セルの内容クリア | `csvStore.deleteSelection` |
| 行操作 | 挿入（上/下, `Cmd/Ctrl+Shift+I`）、削除（**1行**）、複製 | `csvStore.addRow/deleteRow/duplicateRow`, `RowMenu` |
| 列操作 | 追加（前/後）、削除（**1列**）、リネーム | `csvStore.addColumn/deleteColumn/renameColumn`, `ColumnMenu` |
| 並べ替え | 行/列のドラッグ＆ドロップ移動 | `useDragAndDrop`, `csvStore.moveRow/moveColumn` |
| 履歴 | Undo/Redo（before/after 全体スナップショット、最大100件） | `csvStore.undo/redo/addToHistory` |
| その他 | ソート、フィルタ、検索/置換、列幅調整、折り返し表示 | 各コンポーネント |

### 2.2 アーキテクチャ上の重要事実

- **編集はすべてフロントエンド（`csvStore.ts`）で完結**。`addRow`/`deleteRow`/`deleteColumn` 等は
  Rust バックエンドを呼ばず、JS のメモリ上で `rows`/`headers` 配列を操作している。
  （Rust 側にも同名コマンドはあるが未使用。`moveRow`/`moveColumn`/`sortCsvData` のみバックエンド呼び出し）
  → **複数行・複数列削除もフロント側の store 変更だけで実装可能**。バックエンド改修は不要。
- 履歴は各アクションが `beforeData` / `afterData` の**完全スナップショット**を保持。
  → **履歴パネル（任意地点への復帰）が非常に低コストで実装できる**（`afterData` を差し込むだけ）。

---

## 3. ギャップ一覧（Excel / スプレッドシート比）

優先度: ★★★ = 今回の必須要望 / ★★ = 基本体験に強く影響 / ★ = あると望ましい

### A. 選択モデル

| # | ギャップ | 現状 | 優先 |
|---|----------|------|------|
| A-1 | **複数行の選択**（Shift+クリックで連続、Cmd/Ctrl+クリックで非連続） | 1行のみ。`selectRow` が毎回置換 | ★★★ |
| A-2 | **複数列の選択**（同上） | 1列のみ | ★★★ |
| A-3 | 非連続なマルチレンジ選択（Cmd/Ctrl+ドラッグで複数の矩形） | 単一 `selectedRange` のみ | ★ |
| A-4 | コンテキストメニューが「現在の選択」を対象にする | 右クリックした1行/1列だけを対象 | ★★★ |

### B. 行・列の一括操作

| # | ギャップ | 現状 | 優先 |
|---|----------|------|------|
| B-1 | **選択した複数行をまとめて削除** | `deleteRow` は単一 index | ★★★ |
| B-2 | **選択した複数列をまとめて削除** | `deleteColumn` は単一 index | ★★★ |
| B-3 | 選択行数ぶんまとめて挿入（Excel挙動: 3行選択→3行挿入） | 常に1行/1列 | ★★ |
| B-4 | **データセル上の右クリックメニュー**（挿入/削除/内容クリア等） | セルには無い（行番号と列ヘッダーのみ） | ★★ |
| B-5 | 行/列削除のキーボードショートカット `Cmd/Ctrl+-` | 無し | ★★ |
| B-6 | 行/列挿入のキーボードショートカット `Cmd/Ctrl+Shift++` | 行挿入は `Cmd/Ctrl+Shift+I` のみ | ★ |

### C. 編集体験

| # | ギャップ | 現状 | 優先 |
|---|----------|------|------|
| C-1 | **選択セルで文字入力→即編集開始（内容置換）** | 印字文字では編集が始まらない | ★★ |
| C-2 | オートフィル（フィルハンドルのドラッグ、`Cmd/Ctrl+D`下方向 / `Cmd/Ctrl+R`右方向） | 無し | ★ |
| C-3 | 範囲選択内での `Enter`/`Tab` ラップ移動 | 範囲を無視して単純移動 | ★ |
| C-4 | `Home`/`End`/`PageUp`/`PageDown`/`Cmd+Home` ナビゲーション | 無し | ★ |

### D. クリップボード

| # | ギャップ | 現状 | 優先 |
|---|----------|------|------|
| D-1 | ペースト時の**列方向の自動拡張** | 行は拡張するが列は範囲内のみ | ★ |
| D-2 | 「コピーしたセルを挿入」（挿入貼り付け） | 無し | ★ |
| D-3 | カットの視覚表示（マーチングアンツ） | 無し | ★ |

### E. 履歴・確認（要望の中核）

| # | ギャップ | 現状 | 優先 |
|---|----------|------|------|
| E-1 | **操作履歴パネル**（一覧表示＋任意地点へジャンプ） | Undo/Redo のみ、可視化なし | ★★★ |
| E-2 | すべての履歴アクションに人間可読なラベル | 一部のみ `description` を持つ | ★★★ |
| E-3 | 列リネームのモーダル Dialog を廃し確認レス化 | `ColumnMenu` がモーダル Dialog を使用 | ★★ |
| E-4 | 破壊的操作（複数削除等）に確認ダイアログを**足さない**方針の明文化 | — | ★★★ |

---

## 4. 実装案

### フェーズ 0: 型・履歴基盤の整備（E-2 の土台）

**目的:** すべての操作が「1件のラベル付き履歴」として積まれる状態を作る。

`app/src/types/csv.ts`
```ts
export interface HistoryAction {
  type: '...' | 'delete_rows' | 'delete_columns' | 'insert_rows' | 'insert_columns'; // 追加
  data: {
    beforeData: CsvData;
    afterData: CsvData;
    selection?: CsvCell | CsvSelection;
    description?: string;
  };
  label?: string;   // 追加: 履歴パネル表示用（例: "3行を削除"）
  timestamp: number;
}
```

`csvStore.ts` に describe ヘルパを追加し、`addToHistory` 時にラベルを必ず付与する。

```ts
function describeAction(a: HistoryAction): string {
  switch (a.type) {
    case 'cell_update':    return 'セルを編集';
    case 'delete':         return '内容を削除';
    case 'paste':          return '貼り付け';
    case 'add_row':        return '行を挿入';
    case 'delete_row':     return '行を削除';
    case 'delete_rows':    return `${countRows(a)}行を削除`;
    case 'add_column':     return '列を追加';
    case 'delete_column':  return '列を削除';
    case 'delete_columns': return `${countCols(a)}列を削除`;
    case 'rename_column':  return '列名を変更';
    case 'duplicate_row':  return '行を複製';
    case 'replace_all':    return a.data.description ?? '一括置換';
    default:               return a.data.description ?? '操作';
  }
}
```

### フェーズ 1: 複数行・複数列の選択と一括削除（★★★ 必須）

#### 1-1. 選択モデルの拡張（連続範囲）

既存の `CsvSelection`（`type: 'row' | 'column'`）は `startRow..endRow` / `startColumn..endColumn`
の幅を持てるため、**連続する複数行/列は既存の型のまま表現可能**。
セルのハイライト描画（`CsvTable` の `isInSelectedRow` / `isInSelectedColumn`）も
既に範囲判定になっているため、**store が複数行/列の選択を生成すれば描画側は変更ほぼ不要**。

`csvStore.ts` — `selectRow` / `selectColumn` に修飾キー対応を追加:

```ts
selectRow: (rowIndex, opts?: { extend?: boolean }) => {
  const state = get();
  if (!state.data) return;
  const prev = state.selectedRange;
  // Shift+クリック: 直近アンカーから連続範囲
  const anchor = opts?.extend && prev?.type === 'row'
    ? (prev.anchorRow ?? prev.startRow)
    : rowIndex;
  const start = Math.min(anchor, rowIndex);
  const end   = Math.max(anchor, rowIndex);
  set({
    selectedCell: null,
    selectedRange: {
      startRow: start, endRow: end,
      startColumn: 0, endColumn: state.data.headers.length - 1,
      type: 'row',
      anchorRow: anchor, anchorColumn: 0,
      focusRow: rowIndex, focusColumn: 0,
    },
  });
},
// selectColumn も同様に extend 対応
```

`CsvTable.tsx` — ヘッダークリックで修飾キーを渡す:

```ts
const handleRowHeaderClick = (rowIndex, event) => {
  event?.preventDefault(); event?.stopPropagation();
  selectRow(rowIndex, { extend: event?.shiftKey });
};
// handleColumnHeaderClick も同様
```

> 非連続選択（Cmd/Ctrl+クリック, A-3）は `selections: CsvSelection[]` への拡張が必要で
> 影響範囲が広い（描画・コピー・統計）。**フェーズ 3 に切り出し**、まずは連続範囲で要望を満たす。

#### 1-2. 一括削除アクション

`csvStore.ts` に追加。**降順ソートしてから splice** することで index ズレを防ぐ。

```ts
deleteRows: (rowIndices: number[]) => {
  const state = get();
  if (!state.data || rowIndices.length === 0) return;
  const beforeData = { ...state.data, rows: state.data.rows.map(r => [...r]) };
  const sorted = [...new Set(rowIndices)].sort((a, b) => b - a); // 降順
  const newRows = [...state.data.rows];
  sorted.forEach(i => newRows.splice(i, 1));
  const afterData = { ...state.data, rows: newRows };
  set({ data: afterData, hasUnsavedChanges: true, selectedRange: null, selectedCell: null });
  get().addToHistory({
    type: 'delete_rows',
    data: { beforeData, afterData, description: `${sorted.length}行を削除` },
    timestamp: Date.now(),
  });
},

deleteColumns: (columnIndices: number[]) => {
  const state = get();
  if (!state.data || columnIndices.length === 0) return;
  const beforeData = { ...state.data, rows: state.data.rows.map(r => [...r]) };
  const sorted = [...new Set(columnIndices)].sort((a, b) => b - a);
  const newHeaders = [...state.data.headers];
  sorted.forEach(i => newHeaders.splice(i, 1));
  const newRows = state.data.rows.map(r => {
    const nr = [...r]; sorted.forEach(i => nr.splice(i, 1)); return nr;
  });
  const afterData = { ...state.data, headers: newHeaders, rows: newRows };
  set({ data: afterData, hasUnsavedChanges: true, selectedRange: null, selectedCell: null });
  get().addToHistory({
    type: 'delete_columns',
    data: { beforeData, afterData, description: `${sorted.length}列を削除` },
    timestamp: Date.now(),
  });
},
```

選択から一括削除するヘルパ（キーボード／メニュー両方から呼ぶ）:

```ts
deleteSelectedRows: () => {
  const s = get(); const sel = s.selectedRange;
  if (sel?.type !== 'row') return;
  const idx = range(sel.startRow, sel.endRow);
  get().deleteRows(idx);
},
deleteSelectedColumns: () => {
  const s = get(); const sel = s.selectedRange;
  if (sel?.type !== 'column') return;
  const idx = range(sel.startColumn, sel.endColumn);
  get().deleteColumns(idx);
},
```

#### 1-3. コンテキストメニューを「選択」対象にする（A-4）

`RowMenu` は現在、右クリックした行だけを消す。**右クリックした行が現在の行選択に含まれるなら
選択全体を削除**、含まれないならその行だけを対象にする（Excel / スプレッドシート挙動）。

`CsvTable.tsx` の `RowMenu` 呼び出しを変更:

```tsx
<RowMenu
  rowIndex={virtualRow.index}
  selectedRowCount={
    selectedRange?.type === 'row' &&
    selectedRange.startRow <= virtualRow.index &&
    selectedRange.endRow >= virtualRow.index
      ? selectedRange.endRow - selectedRange.startRow + 1
      : 1
  }
  onAddRow={(pos) => addRow(pos, virtualRow.index)}
  onDeleteRow={() => {
    const inSel =
      selectedRange?.type === 'row' &&
      selectedRange.startRow <= virtualRow.index &&
      selectedRange.endRow >= virtualRow.index;
    if (inSel) deleteSelectedRows();
    else deleteRow(virtualRow.index);
  }}
  onDuplicateRow={() => duplicateRow(virtualRow.index)}
>
```

`RowMenu.tsx` はラベルを動的化: `selectedRowCount > 1 ? `${selectedRowCount}行を削除` : '行を削除'`。
`ColumnMenu` も同様に「選択列に含まれるなら `deleteSelectedColumns`」へ分岐。

#### 1-4. キーボードショートカット（B-5）

`CsvTable.handleKeyDown` に追加:

```ts
// Cmd/Ctrl + - : 選択行/列を削除（確認なし・Undo可）
if ((e.metaKey || e.ctrlKey) && (e.key === '-' || e.key === 'Minus')) {
  e.preventDefault();
  if (selectedRange?.type === 'row') deleteSelectedRows();
  else if (selectedRange?.type === 'column') deleteSelectedColumns();
  return;
}
```

> `Delete`/`Backspace` は現状どおり「内容クリア」を維持（Excel/スプレッドシートと一致）。
> 「行・列そのものの削除」は `Cmd/Ctrl+-` とコンテキストメニューに集約する。

#### フェーズ1 完了時点で満たすユーザー要望
- ✅ 複数行を選択して削除（Shift+行ヘッダークリック → `Cmd/Ctrl+-` or 右クリック削除）
- ✅ 複数列を選択して削除（同上）
- ✅ 破壊的操作に確認ダイアログを出さない（すべて即実行）
- ✅ すべて1件の履歴として Undo 可能

### フェーズ 2: 履歴パネル（★★★ E-1 / E-2）

**「履歴から戻れる」= 確認レスの安全網**。既存の全体スナップショット構造のおかげで低コスト。

#### 2-1. store に任意地点ジャンプを追加

```ts
jumpToHistory: (targetIndex: number) => {
  const state = get();
  // targetIndex = -1 は「最初の状態」（最古アクションの beforeData）
  const data =
    targetIndex < 0
      ? state.history[0]?.data.beforeData
      : state.history[targetIndex]?.data.afterData;
  if (!data) return;
  set({ data, historyIndex: targetIndex, hasUnsavedChanges: true });
},
```

#### 2-2. `HistoryPanel.tsx`（新規）

- サイドバー内タブ、またはツールバーの Undo/Redo 横のドロップダウンとして配置。
- `history` を**新しい順**に一覧表示。各行に `label`（describeAction）と相対時刻。
- `historyIndex` の位置を現在地としてハイライト。クリックで `jumpToHistory(i)`。
- 「最初の状態」も選択肢として先頭（または末尾）に表示。

```tsx
export function HistoryPanel() {
  const { history, historyIndex, jumpToHistory } = useCsvStore();
  return (
    <div className="flex flex-col text-sm">
      {history.map((a, i) => (
        <button
          key={a.timestamp}
          onClick={() => jumpToHistory(i)}
          className={cn('flex justify-between px-3 py-1.5 hover:bg-accent',
            i === historyIndex && 'bg-primary/10 font-medium')}
        >
          <span>{describeAction(a)}</span>
          <span className="text-muted-foreground">{formatTime(a.timestamp)}</span>
        </button>
      ))}
      <button onClick={() => jumpToHistory(-1)}
        className={cn('px-3 py-1.5 hover:bg-accent',
          historyIndex === -1 && 'bg-primary/10 font-medium')}>
        最初の状態
      </button>
    </div>
  );
}
```

> 表示は新しい順が直感的なので、描画時に `history` を逆順にして `jumpToHistory` へ渡す実 index に変換する。

### フェーズ 3: 体験の底上げ（★★ / ★ 任意）

| 項目 | 概要 | 参照 |
|------|------|------|
| C-1 文字入力で編集開始 | `handleKeyDown` で `e.key.length === 1 && !修飾キー` のとき `startEditing` し、初期値をその文字に | ★★ |
| B-3 選択数ぶん挿入 | `insertRows(count, pos, at)` を追加し、行選択時は選択行数を count に | ★★ |
| B-4 セル右クリックメニュー | データセルに `CellContextMenu`（切り取り/コピー/貼り付け/内容クリア/行挿入/行削除/列挿入/列削除） | ★★ |
| E-3 列リネームの確認レス化 | `ColumnMenu` のモーダル Dialog を廃し、ヘッダーのインライン編集（既存）に一本化 | ★★ |
| A-3 非連続マルチレンジ | `selections: CsvSelection[]` へ拡張。描画・コピー・統計・削除を配列対応 | ★ |
| C-2 オートフィル | 選択右下にフィルハンドル。ドラッグ／`Cmd/Ctrl+D`・`Cmd/Ctrl+R`。連番検出 | ★ |
| C-3/C-4 ナビ拡充 | 範囲内 Enter/Tab ラップ、Home/End/PageUp/Down | ★ |
| D-1〜D-3 貼り付け強化 | 列方向自動拡張、挿入貼り付け、マーチングアンツ | ★ |

---

## 5. 確認ダイアログの扱い（方針の明文化）

| 箇所 | 現状 | 方針 |
|------|------|------|
| 行/列/セルの削除・編集 | 確認なし（元々） | **維持**。新規の複数削除にも確認を足さない。Undo で担保 |
| 列リネーム（`ColumnMenu`） | モーダル Dialog | インライン編集へ一本化し Dialog 廃止（E-3） |
| 新規作成時の未保存確認（`NewFileDialog`） | モーダル | **対象外**。ファイル破棄はアプリ内 Undo の範囲外のため確認を残す（別途「自動保存＋復元」で解消するなら将来課題） |
| ファイルを開く時の確認（`FileOpenDialog`） | モーダル | 同上。別ウィンドウ/現ウィンドウの選択が主目的で、確認とは性質が異なるため維持 |

> 編集操作（本提案のスコープ）は完全に確認レス化する。ファイル境界をまたぐ操作（未保存破棄）は
> Undo では戻せないため、確認 UI は残すか、別途「下書き自動保存」で置き換えるのが安全。

---

## 6. 実装順序とスコープ

| フェーズ | 内容 | 要望充足 | 目安 |
|----------|------|----------|------|
| 0 | 型 / 履歴ラベル基盤 | E-2 | 小 |
| 1 | 複数行・列の選択＋一括削除＋メニュー/ショートカット | **A-1,A-2,A-4,B-1,B-2,B-5,E-4** | 中 |
| 2 | 履歴パネル（任意地点復帰） | **E-1,E-2** | 中 |
| 3 | 文字入力編集開始 / セル右クリック / 複数挿入 / リネーム確認レス | C-1,B-3,B-4,E-3 | 中 |
| 4（任意） | 非連続選択 / オートフィル / ナビ・貼り付け強化 | A-3,C-2〜4,D-* | 大 |

**フェーズ 0〜2 で、ユーザー要望（複数行・列の選択削除＋確認レス＋全Undo＋履歴復帰）を完全に満たす。**
フェーズ 3 以降は Excel / スプレッドシート体験へさらに近づけるための積み増し。

---

## 7. リスク・考慮点

- **メモリ**: 履歴は全体スナップショット方式。100万行級では 100 件 × 全行コピーが重い。
  現状の `MAX_HISTORY_SIZE = 100` を維持しつつ、将来的にはコマンドパターン（差分パッチ）への移行を検討。
  本提案の範囲では既存方式を踏襲（履歴パネルはこの方式だからこそ低コストで実現できる）。
- **仮想スクロール整合**: 大量行削除後に選択・スクロール位置がずれないよう、削除後は選択をクリアする（上記実装済み）。
- **フィルタ適用中の削除**: 表示は `getFilteredData()` の結果。フィルタ中の index と実データ index の
  対応に注意（フィルタ有効時は行番号が表示行の index）。まずは**フィルタ無効時の一括削除**を対象にし、
  フィルタ中の削除は表示行→実行番号のマッピングを別途実装するか、削除操作時に一時的に注意喚起せず素直に
  「表示されている行」を実データから消す方式に統一する（要 UX 判断）。
- **`addToHistory` の整理**: `MAX_HISTORY_SIZE` 超過時に `shift()` する分岐と通常分岐で
  `set` が二重に書かれた冗長構造になっている（`csvStore.ts` 現行 792-813 行）。動作は正しいが、
  フェーズ0で `label` 付与を入れる際に一本化しておくと保守性が上がる。
