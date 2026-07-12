import React from 'react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from '@/components/ui/context-menu';
import { Trash2, Copy, ArrowUp, ArrowDown } from 'lucide-react';

interface RowMenuProps {
  rowIndex: number;
  /** 現在の行選択に含まれる行数（1なら単一行）。複数選択時はまとめて挿入/削除する */
  selectedRowCount?: number;
  onAddRow: (position: 'above' | 'below') => void;
  onDeleteRow: () => void;
  onDuplicateRow: () => void;
  children: React.ReactNode;
}

export const RowMenu: React.FC<RowMenuProps> = ({
  rowIndex: _rowIndex,
  selectedRowCount = 1,
  onAddRow,
  onDeleteRow,
  onDuplicateRow,
  children,
}) => {
  const isMulti = selectedRowCount > 1;
  const insertAboveLabel = isMulti ? `上に${selectedRowCount}行挿入` : '上に行を挿入';
  const insertBelowLabel = isMulti ? `下に${selectedRowCount}行挿入` : '下に行を挿入';
  const deleteLabel = isMulti ? `${selectedRowCount}行を削除` : '行を削除';

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem onClick={() => onAddRow('above')}>
          <ArrowUp className="mr-2 h-4 w-4" />
          {insertAboveLabel}
        </ContextMenuItem>
        <ContextMenuItem onClick={() => onAddRow('below')}>
          <ArrowDown className="mr-2 h-4 w-4" />
          {insertBelowLabel}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onClick={onDuplicateRow}>
          <Copy className="mr-2 h-4 w-4" />
          行を複製
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          onClick={onDeleteRow}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleteLabel}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
};