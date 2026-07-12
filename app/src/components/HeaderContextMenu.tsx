import { useEffect } from 'react';
import {
  Edit2,
  ArrowLeft,
  ArrowRight,
  Trash2,
} from 'lucide-react';

export interface HeaderMenuState {
  x: number;
  y: number;
  columnIndex: number;
}

interface HeaderContextMenuProps {
  state: HeaderMenuState | null;
  onClose: () => void;
  /** 列削除ラベル（"列を削除" または "N列を削除"） */
  columnDeleteLabel: string;
  /** 列追加ラベル（前）（"前に列を追加" または "前にN列追加"） */
  addBeforeLabel: string;
  /** 列追加ラベル（後）（"後に列を追加" または "後にN列追加"） */
  addAfterLabel: string;
  onRename: () => void;
  onInsertColumnBefore: () => void;
  onInsertColumnAfter: () => void;
  onDeleteColumn: () => void;
}

/**
 * 列ヘッダー上の右クリックメニュー。
 * CellContextMenuと同様の軽量実装。
 */
export function HeaderContextMenu({
  state,
  onClose,
  columnDeleteLabel,
  addBeforeLabel,
  addAfterLabel,
  onRename,
  onInsertColumnBefore,
  onInsertColumnAfter,
  onDeleteColumn,
}: HeaderContextMenuProps) {
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
  const MENU_WIDTH = 200;
  const MENU_MAX_HEIGHT = 250;
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
        className="fixed z-[101] min-w-[12rem] max-h-[250px] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
        style={{ left, top }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className={itemCls} onClick={run(onRename)}>
          <Edit2 className="h-4 w-4" /> 列名を変更
        </button>

        <div className="-mx-1 my-1 h-px bg-muted" />

        <button className={itemCls} onClick={run(onInsertColumnBefore)}>
          <ArrowLeft className="h-4 w-4" /> {addBeforeLabel}
        </button>
        <button className={itemCls} onClick={run(onInsertColumnAfter)}>
          <ArrowRight className="h-4 w-4" /> {addAfterLabel}
        </button>

        <div className="-mx-1 my-1 h-px bg-muted" />

        <button className={`${itemCls} text-red-600`} onClick={run(onDeleteColumn)}>
          <Trash2 className="h-4 w-4" /> {columnDeleteLabel}
        </button>
      </div>
    </>
  );
}
