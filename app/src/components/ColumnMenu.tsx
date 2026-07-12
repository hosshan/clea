import React, { useState } from 'react';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ColumnMenuProps {
  columnIndex: number;
  columnName: string;
  /** 現在の列選択に含まれる列数（1なら単一列）。複数選択時はまとめて挿入/削除する */
  selectedColumnCount?: number;
  onAddColumn: (position: 'before' | 'after') => void;
  onDeleteColumn: () => void;
  onRenameColumn: (newName: string) => void;
}

export const ColumnMenu: React.FC<ColumnMenuProps> = ({
  columnIndex: _columnIndex,
  columnName,
  selectedColumnCount = 1,
  onAddColumn,
  onDeleteColumn,
  onRenameColumn,
}) => {
  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [newColumnName, setNewColumnName] = useState(columnName);
  const isMulti = selectedColumnCount > 1;
  const addBeforeLabel = isMulti ? `前に${selectedColumnCount}列追加` : '前に列を追加';
  const addAfterLabel = isMulti ? `後に${selectedColumnCount}列追加` : '後に列を追加';
  const deleteLabel = isMulti ? `${selectedColumnCount}列を削除` : '列を削除';

  // Update newColumnName when columnName prop changes or dialog opens
  React.useEffect(() => {
    if (isRenameDialogOpen) {
      setNewColumnName(columnName);
    }
  }, [isRenameDialogOpen, columnName]);

  const handleRename = () => {
    if (newColumnName.trim()) {
      onRenameColumn(newColumnName.trim());
      setIsRenameDialogOpen(false);
    }
  };



  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
            <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onClick={() => setIsRenameDialogOpen(true)}>
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

      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setIsRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Column</DialogTitle>
            <DialogDescription>
              Enter a new name for the column "{columnName}"
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                className="col-span-3"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRename();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};