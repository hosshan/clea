import { useEffect } from 'react';
import {
  Scissors,
  Copy,
  ClipboardPaste,
  Eraser,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Trash2,
} from 'lucide-react';

export interface CellMenuState {
  x: number;
  y: number;
  row: number;
  column: number;
}

interface CellContextMenuProps {
  state: CellMenuState | null;
  onClose: () => void;
  canPaste: boolean;
  /** 行削除ラベル（"行を削除" または "N行を削除"） */
  rowDeleteLabel: string;
  /** 列削除ラベル（"列を削除" または "N列を削除"） */
  columnDeleteLabel: string;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onClearContents: () => void;
  onInsertRowAbove: () => void;
  onInsertRowBelow: () => void;
  onDeleteRow: () => void;
  onInsertColumnBefore: () => void;
  onInsertColumnAfter: () => void;
  onDeleteColumn: () => void;
}

/**
 * データセル上の右クリックメニュー（Excel / スプレッドシート相当）。
 * Radix の ContextMenu は仮想化セル1つ1つをラップすると重くなるため、
 * マウス座標に配置する軽量な自前メニューとして実装している。
 * すべての操作は確認ダイアログなし・Undo 可能。
 */
export function CellContextMenu({
  state,
  onClose,
  canPaste,
  rowDeleteLabel,
  columnDeleteLabel,
  onCut,
  onCopy,
  onPaste,
  onClearContents,
  onInsertRowAbove,
  onInsertRowBelow,
  onDeleteRow,
  onInsertColumnBefore,
  onInsertColumnAfter,
  onDeleteColumn,
}: CellContextMenuProps) {
  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [state, onClose]);

  if (!state) return null;

  const run = (fn: () => void) => () => {
    fn();
    onClose();
  };

  // 画面端でメニューがはみ出さないよう位置を軽く補正
  const MENU_WIDTH = 220;
  const MENU_MAX_HEIGHT = 400;
  const left = Math.min(state.x, window.innerWidth - MENU_WIDTH - 8);
  const top = Math.min(state.y, window.innerHeight - MENU_MAX_HEIGHT - 8);

  const itemCls =
    'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-left outline-none transition-colors hover:bg-accent focus:bg-accent disabled:opacity-40 disabled:pointer-events-none';

  return (
    <>
      {/* クリックアウトで閉じるための透明オーバーレイ（右クリックでも閉じる） */}
      <div
        className="fixed inset-0 z-[100]"
        onMouseDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div
        role="menu"
        className="fixed z-[101] min-w-[13rem] max-h-[400px] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        style={{ left, top }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className={itemCls} onClick={run(onCut)}>
          <Scissors className="h-4 w-4" /> 切り取り
          <span className="ml-auto text-xs text-muted-foreground">⌘X</span>
        </button>
        <button className={itemCls} onClick={run(onCopy)}>
          <Copy className="h-4 w-4" /> コピー
          <span className="ml-auto text-xs text-muted-foreground">⌘C</span>
        </button>
        <button className={itemCls} onClick={run(onPaste)} disabled={!canPaste}>
          <ClipboardPaste className="h-4 w-4" /> 貼り付け
          <span className="ml-auto text-xs text-muted-foreground">⌘V</span>
        </button>
        <button className={itemCls} onClick={run(onClearContents)}>
          <Eraser className="h-4 w-4" /> 内容をクリア
          <span className="ml-auto text-xs text-muted-foreground">Del</span>
        </button>

        <div className="-mx-1 my-1 h-px bg-muted" />

        <button className={itemCls} onClick={run(onInsertRowAbove)}>
          <ArrowUp className="h-4 w-4" /> 上に行を挿入
        </button>
        <button className={itemCls} onClick={run(onInsertRowBelow)}>
          <ArrowDown className="h-4 w-4" /> 下に行を挿入
        </button>
        <button className={`${itemCls} text-red-600`} onClick={run(onDeleteRow)}>
          <Trash2 className="h-4 w-4" /> {rowDeleteLabel}
        </button>

        <div className="-mx-1 my-1 h-px bg-muted" />

        <button className={itemCls} onClick={run(onInsertColumnBefore)}>
          <ArrowLeft className="h-4 w-4" /> 前に列を挿入
        </button>
        <button className={itemCls} onClick={run(onInsertColumnAfter)}>
          <ArrowRight className="h-4 w-4" /> 後に列を挿入
        </button>
        <button className={`${itemCls} text-red-600`} onClick={run(onDeleteColumn)}>
          <Trash2 className="h-4 w-4" /> {columnDeleteLabel}
        </button>
      </div>
    </>
  );
}
