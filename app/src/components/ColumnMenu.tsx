import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/Button';
import {
  ChevronDown,
  Trash2,
  Edit2,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface ColumnMenuProps {
  columnIndex: number;
  columnName: string;
  /** 現在の列選択に含まれる列数（1なら単一列）。複数選択時はまとめて挿入/削除する */
  selectedColumnCount?: number;
  onAddColumn: (position: 'before' | 'after') => void;
  onDeleteColumn: () => void;
  /** 列名変更を開始する（ヘッダのインライン編集をトリガーする / モーダルは使わない） */
  onStartRename: () => void;
}

export const ColumnMenu: React.FC<ColumnMenuProps> = ({
  columnIndex: _columnIndex,
  columnName: _columnName,
  selectedColumnCount = 1,
  onAddColumn,
  onDeleteColumn,
  onStartRename,
}) => {
  const isMulti = selectedColumnCount > 1;
  const addBeforeLabel = isMulti ? `前に${selectedColumnCount}列追加` : '前に列を追加';
  const addAfterLabel = isMulti ? `後に${selectedColumnCount}列追加` : '後に列を追加';
  const deleteLabel = isMulti ? `${selectedColumnCount}列を削除` : '列を削除';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuItem onClick={onStartRename}>
          <Edit2 className="mr-2 h-4 w-4" />
          列名を変更
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onAddColumn('before')}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          {addBeforeLabel}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onAddColumn('after')}
        >
          <ArrowRight className="mr-2 h-4 w-4" />
          {addAfterLabel}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onDeleteColumn}
          className="text-red-600"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {deleteLabel}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
