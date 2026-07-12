import { History, Check } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/Button';
import { useCsvStore, describeHistoryAction } from '../store/csvStore';
import { cn } from '@/lib/utils';

function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
}

/**
 * 操作履歴パネル。
 * すべての編集操作を一覧表示し、任意の地点へワンクリックで戻れる。
 * 「確認ダイアログを出さず、いつでも履歴から復帰できる」設計の中核 UI。
 */
export function HistoryPanel() {
  const { data, history, historyIndex, jumpToHistory } = useCsvStore();

  const hasHistory = history.length > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={!data || !hasHistory}
          className="flex items-center space-x-1"
          title="操作履歴"
        >
          <History className="h-4 w-4" />
          <span>History</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>操作履歴</span>
          <span className="text-xs font-normal text-muted-foreground">
            {history.length}件
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {/* 新しい順に表示 */}
        {[...history]
          .map((action, idx) => ({ action, idx }))
          .reverse()
          .map(({ action, idx }) => {
            const isCurrent = idx === historyIndex;
            const isFuture = idx > historyIndex; // Redo 待ち（未適用）の操作
            return (
              <button
                key={action.timestamp}
                onClick={() => jumpToHistory(idx)}
                className={cn(
                  'flex w-full items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent',
                  isCurrent && 'bg-primary/10 font-medium',
                  isFuture && 'text-muted-foreground/60'
                )}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <Check
                    className={cn(
                      'h-3.5 w-3.5 shrink-0',
                      isCurrent ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  <span className="truncate">
                    {action.label ?? describeHistoryAction(action)}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTime(action.timestamp)}
                </span>
              </button>
            );
          })}

        {/* 最初の状態（すべての操作を取り消した地点） */}
        <button
          onClick={() => jumpToHistory(-1)}
          className={cn(
            'flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent',
            historyIndex === -1 && 'bg-primary/10 font-medium'
          )}
        >
          <Check
            className={cn(
              'h-3.5 w-3.5 shrink-0',
              historyIndex === -1 ? 'opacity-100' : 'opacity-0'
            )}
          />
          <span className="text-muted-foreground">最初の状態</span>
        </button>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
