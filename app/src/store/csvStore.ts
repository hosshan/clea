import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CsvData, CsvCell, CsvSelection, ViewportRange, FilterConfig, SortConfig, HistoryAction, SortState } from '../types/csv';
import { applyFilter } from '../utils/filtering';

/** 履歴アクションから人間可読なラベルを生成する（履歴パネル表示用） */
export function describeHistoryAction(action: HistoryAction): string {
  switch (action.type) {
    case 'cell_update':     return 'セルを編集';
    case 'range_update':    return '範囲を編集';
    case 'delete':          return '内容を削除';
    case 'cut':             return '切り取り';
    case 'paste':           return '貼り付け';
    case 'add_row':         return '行を挿入';
    case 'delete_row':      return '行を削除';
    case 'delete_rows':     return action.data.description ?? '複数行を削除';
    case 'insert_rows':     return action.data.description ?? '複数行を挿入';
    case 'duplicate_row':   return '行を複製';
    case 'add_column':      return '列を追加';
    case 'delete_column':   return '列を削除';
    case 'delete_columns':  return action.data.description ?? '複数列を削除';
    case 'insert_columns':  return action.data.description ?? '複数列を挿入';
    case 'rename_column':   return '列名を変更';
    case 'replace_all':     return action.data.description ?? '一括置換';
    case 'replace_current': return '置換';
    default:                return action.data.description ?? '操作';
  }
}

interface CsvState {
  // Data state
  data: CsvData | null;
  currentFilePath: string | null;
  isLoading: boolean;
  loadingProgress: number; // 0-100
  error: string | null;

  // Selection state
  selectedCell: CsvCell | null;
  selectedRange: CsvSelection | null;

  // Viewport state
  viewportRange: ViewportRange;

  // Column width state
  columnWidths: Record<number, number>;
  defaultColumnWidth: number;

  // Display mode
  wrapText: boolean;

  // Editing state
  editingCell: CsvCell | null;
  hasUnsavedChanges: boolean;

  // Clipboard state
  clipboard: string[][] | null;

  // Filter and sort state
  filters: FilterConfig[];
  sorts: SortConfig[];
  currentSort: SortState;

  // Search state
  searchResults: CsvCell[];
  currentSearchIndex: number;
  searchQuery: string;
  searchOptions: {
    caseSensitive: boolean;
    wholeWord: boolean;
    regex: boolean;
    columnIndex?: number;
  };
  scrollToCell: ((row: number, column: number) => void) | null;

  // History state for Undo/Redo
  history: HistoryAction[];
  historyIndex: number;

  // AI Assistant state
  aiMessages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    type?: 'analysis' | 'transformation' | 'error';
    data?: any;
  }>;
  aiPendingChanges: any | null;

  // Validation state
  cellValidationErrors: Record<string, string>; // key: "row:column", value: error message
  setCellValidationError: (row: number, column: number, error: string | null) => void;
  getCellValidationError: (row: number, column: number) => string | null;

  // Actions
  setData: (data: CsvData, filePath?: string) => void;
  setCurrentFilePath: (path: string | null) => void;
  setLoading: (loading: boolean) => void;
  setLoadingProgress: (progress: number) => void;
  setError: (error: string | null) => void;

  selectCell: (cell: CsvCell | null) => void;
  selectRange: (range: CsvSelection | null) => void;
  selectRow: (rowIndex: number, opts?: { extend?: boolean }) => void;
  selectColumn: (columnIndex: number, opts?: { extend?: boolean }) => void;
  selectAll: () => void;
  extendSelection: (cell: CsvCell) => void;

  setViewportRange: (range: ViewportRange) => void;
  saveViewState: () => Promise<void>;

  startEditing: (cell: CsvCell) => void;
  stopEditing: () => void;
  updateCell: (cell: CsvCell, value: string) => void;

  addFilter: () => void;
  updateFilter: (id: string, updates: Partial<FilterConfig>) => void;
  removeFilter: (id: string) => void;
  clearFilters: () => void;
  getFilteredData: () => CsvData | null;

  addSort: (sort: SortConfig) => void;
  removeSort: (index: number) => void;
  clearSorts: () => void;

  // New sort functionality
  applySorting: (sortState: SortState) => void;
  clearSorting: () => void;

  // Row and column reordering
  moveRow: (fromIndex: number, toIndex: number) => void;
  moveColumn: (fromIndex: number, toIndex: number) => void;

  // Clipboard actions
  copySelection: () => Promise<void>;
  cutSelection: () => void;
  paste: (targetCell?: CsvCell) => void;
  deleteSelection: () => void;

  // Autofill (フィル)
  fillDown: () => void;
  fillFromHandle: (
    origin: { r1: number; c1: number; r2: number; c2: number },
    target: { startRow: number; startColumn: number; endRow: number; endColumn: number }
  ) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  addToHistory: (action: HistoryAction) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  jumpToHistory: (targetIndex: number) => void;

  // Row operations with history
  addRow: (position: 'above' | 'below', rowIndex?: number) => void;
  insertRows: (position: 'above' | 'below', rowIndex: number, count: number) => void;
  deleteRow: (rowIndex: number) => void;
  deleteRows: (rowIndices: number[]) => void;
  deleteSelectedRows: () => void;
  duplicateRow: (rowIndex: number) => void;

  // Column operations with history
  addColumn: (position: 'before' | 'after', columnIndex: number) => void;
  insertColumns: (position: 'before' | 'after', columnIndex: number, count: number) => void;
  deleteColumn: (columnIndex: number) => void;
  deleteColumns: (columnIndices: number[]) => void;
  deleteSelectedColumns: () => void;
  renameColumn: (columnIndex: number, newName: string) => void;

  // Batch operations with history
  replaceAll: (newData: CsvData, description?: string) => void;

  // Column width operations
  setColumnWidth: (columnIndex: number, width: number) => void;
  getColumnWidth: (columnIndex: number) => number;
  resetColumnWidths: () => void;

  // Display mode actions
  setWrapText: (wrap: boolean) => void;
  toggleWrapText: () => void;

  // Search operations
  setSearchQuery: (query: string, options?: Partial<CsvState['searchOptions']>) => void;
  performSearch: () => void;
  clearSearch: () => void;
  nextSearchResult: () => void;
  previousSearchResult: () => void;
  replaceCurrentResult: (replaceText: string) => void;
  replaceAllResults: (replaceText: string) => void;
  setScrollToCell: (callback: ((row: number, column: number) => void) | null) => void;

  // AI Assistant actions
  addAiMessage: (message: CsvState['aiMessages'][0]) => void;
  setAiPendingChanges: (changes: any | null) => void;
  clearAiMessages: () => void;

  markSaved: () => void;
  reset: () => void;
  createNewCsv: () => void;
}

export const useCsvStore = create<CsvState>()(
  devtools(
    (set, get) => ({
      // Initial state
      data: null,
      currentFilePath: null,
      isLoading: false,
      loadingProgress: 0,
      error: null,

      selectedCell: null,
      selectedRange: null,

      viewportRange: {
        startRow: 0,
        endRow: 50,
        startColumn: 0,
        endColumn: 10
      },

      columnWidths: {},
      defaultColumnWidth: 150,

      wrapText: false,

      editingCell: null,
      hasUnsavedChanges: false,

      clipboard: null,

      filters: [],
      sorts: [],
      currentSort: { columns: [] },

      searchResults: [],
      currentSearchIndex: -1,
      searchQuery: '',
      searchOptions: {
        caseSensitive: false,
        wholeWord: false,
        regex: false,
      },
      scrollToCell: null,

      history: [],
      historyIndex: -1,

      aiMessages: [],
      aiPendingChanges: null,

      cellValidationErrors: {},

      // Actions
      setData: async (data, filePath) => {
        const newFilePath = filePath || get().currentFilePath;
        set({
          data,
          error: null,
          currentFilePath: newFilePath,
          // 新しいデータ読み込み時は前ファイルの履歴・選択を引き継がない
          // （履歴パネルに前ファイルの操作が残らないようにする）
          history: [],
          historyIndex: -1,
          selectedCell: null,
          selectedRange: null,
          editingCell: null,
        });

        // Load sort state and view state from metadata if file path is available
        if (newFilePath) {
          try {
            const { tauriAPI } = await import('../hooks/useTauri');
            const savedSortState = await tauriAPI.loadSortState(newFilePath);
            if (savedSortState && savedSortState.columns.length > 0) {
              set({ currentSort: savedSortState });
            }

            const savedViewState = await tauriAPI.loadViewState(newFilePath);
            if (savedViewState) {
              set({
                columnWidths: savedViewState.columnWidths || {},
                viewportRange: savedViewState.viewportRange || get().viewportRange,
                defaultColumnWidth: savedViewState.defaultColumnWidth || get().defaultColumnWidth,
              });
            }
          } catch (error) {
            console.warn('Failed to load state from metadata:', error);
          }
        }
      },
      setCurrentFilePath: (currentFilePath) => set({ currentFilePath }),
      setLoading: (isLoading) => set({ isLoading, loadingProgress: isLoading ? 0 : 100 }),
      setLoadingProgress: (loadingProgress) => set({ loadingProgress }),
      setError: (error) => set({ error, isLoading: false }),

      selectCell: (selectedCell) => set({ selectedCell, selectedRange: null }),
      selectRange: (selectedRange) => set({ selectedRange, selectedCell: null }),

      selectRow: (rowIndex, opts) => {
        const state = get();
        if (!state.data) return;

        // Shift+クリック: 直近の行選択のアンカーから連続範囲を選択
        const prev = state.selectedRange;
        const anchor =
          opts?.extend && prev?.type === 'row'
            ? prev.anchorRow ?? prev.startRow
            : rowIndex;

        const selection: CsvSelection = {
          startRow: Math.min(anchor, rowIndex),
          startColumn: 0,
          endRow: Math.max(anchor, rowIndex),
          endColumn: state.data.headers.length - 1,
          type: 'row',
          anchorRow: anchor,
          anchorColumn: 0,
          focusRow: rowIndex,
          focusColumn: state.data.headers.length - 1
        };

        set({ selectedRange: selection, selectedCell: null });
      },

      selectColumn: (columnIndex, opts) => {
        const state = get();
        if (!state.data) return;

        // Shift+クリック: 直近の列選択のアンカーから連続範囲を選択
        const prev = state.selectedRange;
        const anchor =
          opts?.extend && prev?.type === 'column'
            ? prev.anchorColumn ?? prev.startColumn
            : columnIndex;

        const selection: CsvSelection = {
          startRow: 0,
          startColumn: Math.min(anchor, columnIndex),
          endRow: state.data.rows.length - 1,
          endColumn: Math.max(anchor, columnIndex),
          type: 'column',
          anchorRow: 0,
          anchorColumn: anchor,
          focusRow: state.data.rows.length - 1,
          focusColumn: columnIndex
        };
        set({ selectedRange: selection, selectedCell: null });
      },

      selectAll: () => {
        const state = get();
        if (!state.data) return;

        const selection: CsvSelection = {
          startRow: 0,
          startColumn: 0,
          endRow: state.data.rows.length - 1,
          endColumn: state.data.headers.length - 1,
          type: 'range',
          anchorRow: 0,
          anchorColumn: 0,
          focusRow: state.data.rows.length - 1,
          focusColumn: state.data.headers.length - 1
        };

        set({ selectedRange: selection, selectedCell: null });
      },

      extendSelection: (cell) => {
        const state = get();

        // If there's a selected cell, create a range from that cell to the new cell
        if (state.selectedCell) {
          const newSelection: CsvSelection = {
            startRow: Math.min(state.selectedCell.row, cell.row),
            startColumn: Math.min(state.selectedCell.column, cell.column),
            endRow: Math.max(state.selectedCell.row, cell.row),
            endColumn: Math.max(state.selectedCell.column, cell.column),
            type: 'range',
            anchorRow: state.selectedCell.row,
            anchorColumn: state.selectedCell.column,
            focusRow: cell.row,
            focusColumn: cell.column
          };
          set({ selectedRange: newSelection, selectedCell: null });
        }
        // If there's already a selection, extend it from the anchor point
        else if (state.selectedRange) {
          const anchorRow = state.selectedRange.anchorRow ?? state.selectedRange.startRow;
          const anchorColumn = state.selectedRange.anchorColumn ?? state.selectedRange.startColumn;

          const newSelection: CsvSelection = {
            startRow: Math.min(anchorRow, cell.row),
            startColumn: Math.min(anchorColumn, cell.column),
            endRow: Math.max(anchorRow, cell.row),
            endColumn: Math.max(anchorColumn, cell.column),
            type: 'range',
            anchorRow,
            anchorColumn,
            focusRow: cell.row,
            focusColumn: cell.column
          };
          set({ selectedRange: newSelection, selectedCell: null });
        }
        // Otherwise, just select the cell
        else {
          set({ selectedCell: cell, selectedRange: null });
        }
      },

      setViewportRange: (viewportRange) => set({ viewportRange }),
      
      saveViewState: async () => {
        const state = get();
        if (state.currentFilePath) {
          try {
            const { tauriAPI } = await import('../hooks/useTauri');
            await tauriAPI.saveViewState(state.currentFilePath, {
              columnWidths: state.columnWidths,
              viewportRange: state.viewportRange,
              defaultColumnWidth: state.defaultColumnWidth,
            });
          } catch (error) {
            console.warn('Failed to save view state:', error);
          }
        }
      },

      startEditing: (editingCell) => set({ editingCell }),
      stopEditing: () => set({ editingCell: null }),

      updateCell: (cell, value) => {
        const state = get();
        if (!state.data) return;

        // Store before state for history - deep copy rows
        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };

        const newRows = [...state.data.rows];
        if (newRows[cell.row]) {
          newRows[cell.row] = [...newRows[cell.row]];
          newRows[cell.row][cell.column] = value;
        }

        const afterData = {
          ...state.data,
          rows: newRows
        };

        // Add to history
        const historyAction: HistoryAction = {
          type: 'cell_update',
          data: {
            beforeData,
            afterData,
            selection: cell
          },
          timestamp: Date.now()
        };

        // Keep the cell selected after updating so navigation continues to work
        const updatedCell = { ...cell, value };

        set({
          data: afterData,
          hasUnsavedChanges: true,
          editingCell: null,
          selectedCell: updatedCell
        });

        // Add to history after state update
        get().addToHistory(historyAction);
      },

      addFilter: () => {
        const state = get();
        const newFilter: FilterConfig = {
          id: `filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          column: 0,
          operator: 'contains',
          value: '',
          dataType: 'text',
          isActive: true,
        };
        set({ filters: [...state.filters, newFilter] });
      },

      updateFilter: (id: string, updates: Partial<FilterConfig>) => {
        const state = get();
        const newFilters = state.filters.map(filter =>
          filter.id === id ? { ...filter, ...updates } : filter
        );
        set({ filters: newFilters });
      },

      removeFilter: (id: string) => {
        const state = get();
        const newFilters = state.filters.filter(filter => filter.id !== id);
        set({ filters: newFilters });
      },

      clearFilters: () => set({ filters: [] }),

      getFilteredData: () => {
        const state = get();
        if (!state.data || state.filters.length === 0) {
          return state.data;
        }

        const activeFilters = state.filters.filter(f => f.isActive);
        if (activeFilters.length === 0) {
          return state.data;
        }

        const filteredRows = state.data.rows.filter(row => {
          return activeFilters.every(filter => {
            const cellValue = row[filter.column] || '';
            return applyFilter(cellValue, filter);
          });
        });

        return {
          ...state.data,
          rows: filteredRows,
          metadata: {
            ...state.data.metadata,
            rowCount: filteredRows.length,
          }
        };
      },

      addSort: (sort) => {
        const state = get();
        const newSorts = state.sorts.filter(s => s.column !== sort.column);
        set({ sorts: [sort, ...newSorts] });
      },

      removeSort: (index) => {
        const state = get();
        const newSorts = state.sorts.filter((_, i) => i !== index);
        set({ sorts: newSorts });
      },

      clearSorts: () => set({ sorts: [] }),

      // New sort functionality with history support
      applySorting: async (sortState: SortState) => {
        const state = get();
        if (!state.data || !state.currentFilePath) return;

        try {
          // Import tauriAPI here to avoid circular dependencies
          const { tauriAPI } = await import('../hooks/useTauri');

          const beforeData = {
            ...state.data,
            rows: state.data.rows.map(row => [...row])
          };

          const sortedData = await tauriAPI.sortCsvData(state.data, sortState);

          const historyAction: HistoryAction = {
            type: 'replace_all',
            data: {
              beforeData,
              afterData: sortedData,
              description: `Sort by ${sortState.columns.length} column${sortState.columns.length > 1 ? 's' : ''}`
            },
            timestamp: Date.now()
          };

          set({
            data: sortedData,
            currentSort: sortState,
            hasUnsavedChanges: true
          });

          get().addToHistory(historyAction);

          // Save sort state to metadata
          try {
            await tauriAPI.saveSortState(state.currentFilePath, sortState);
          } catch (error) {
            console.warn('Failed to save sort state to metadata:', error);
          }
        } catch (error) {
          console.error('Failed to apply sorting:', error);
          set({ error: 'Failed to apply sorting' });
        }
      },

      clearSorting: async () => {
        const state = get();
        const emptySortState = { columns: [] };

        set({ currentSort: emptySortState });

        // Save empty sort state to metadata
        if (state.currentFilePath) {
          try {
            const { tauriAPI } = await import('../hooks/useTauri');
            await tauriAPI.saveSortState(state.currentFilePath, emptySortState);
          } catch (error) {
            console.warn('Failed to save empty sort state to metadata:', error);
          }
        }
      },

      // Row and column reordering with history support
      moveRow: async (fromIndex: number, toIndex: number) => {
        const state = get();
        if (!state.data) return;

        try {
          const { tauriAPI } = await import('../hooks/useTauri');

          const beforeData = {
            ...state.data,
            rows: state.data.rows.map(row => [...row])
          };

          const newData = await tauriAPI.moveRow(state.data, fromIndex, toIndex);

          const historyAction: HistoryAction = {
            type: 'replace_all',
            data: {
              beforeData,
              afterData: newData,
              description: `Move row from position ${fromIndex + 1} to ${toIndex + 1}`
            },
            timestamp: Date.now()
          };

          set({
            data: newData,
            hasUnsavedChanges: true
          });

          get().addToHistory(historyAction);
        } catch (error) {
          console.error('Failed to move row:', error);
          set({ error: 'Failed to move row' });
        }
      },

      moveColumn: async (fromIndex: number, toIndex: number) => {
        const state = get();
        if (!state.data) return;

        try {
          const { tauriAPI } = await import('../hooks/useTauri');

          const beforeData = {
            ...state.data,
            rows: state.data.rows.map(row => [...row])
          };

          const newData = await tauriAPI.moveColumn(state.data, fromIndex, toIndex);

          const historyAction: HistoryAction = {
            type: 'replace_all',
            data: {
              beforeData,
              afterData: newData,
              description: `Move column from position ${fromIndex + 1} to ${toIndex + 1}`
            },
            timestamp: Date.now()
          };

          set({
            data: newData,
            hasUnsavedChanges: true
          });

          get().addToHistory(historyAction);
        } catch (error) {
          console.error('Failed to move column:', error);
          set({ error: 'Failed to move column' });
        }
      },

      // Clipboard operations
      copySelection: async () => {
        const state = get();
        if (!state.data) return;

        let cellsToClip: string[][] = [];

        if (state.selectedCell) {
          // Copy single cell
          cellsToClip = [[state.selectedCell.value]];
        } else if (state.selectedRange) {
          // Copy range selection
          for (let row = state.selectedRange.startRow; row <= state.selectedRange.endRow; row++) {
            const rowData: string[] = [];
            for (let col = state.selectedRange.startColumn; col <= state.selectedRange.endColumn; col++) {
              rowData.push(state.data.rows[row]?.[col] || '');
            }
            cellsToClip.push(rowData);
          }
        }

        if (cellsToClip.length > 0) {
          // Store in internal clipboard for app-internal paste operations
          set({ clipboard: cellsToClip });

          // Also copy to system clipboard in TSV format for spreadsheet applications
          try {
            const { tauriAPI } = await import('../hooks/useTauri');
            await tauriAPI.copySelectionToClipboard(cellsToClip);
          } catch (error) {
            console.error('Failed to copy to system clipboard:', error);
            // Don't throw - internal clipboard still works for app-internal paste
          }
        }
      },

      cutSelection: () => {
        const state = get();
        // First copy the selection (async, but we don't wait for it)
        state.copySelection().catch((error) => {
          console.error('Failed to copy selection for cut:', error);
        });
        // Then delete it
        state.deleteSelection();
      },

      paste: (targetCell) => {
        const state = get();
        if (!state.data || !state.clipboard) return;

        // Store before state for history - deep copy rows
        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };

        // 貼り付け先: 明示指定 → 選択セル → 範囲選択の左上
        const target =
          targetCell ||
          state.selectedCell ||
          (state.selectedRange
            ? {
                row: state.selectedRange.startRow,
                column: state.selectedRange.startColumn,
                value: '',
              }
            : null);

        if (!target) return;

        const startRow = target.row;
        const startCol = target.column;

        // 貼り付けに必要な列数を算出し、不足していれば列を自動拡張（Excel挙動）
        let maxColNeeded = state.data.headers.length;
        for (const clipRow of state.clipboard) {
          maxColNeeded = Math.max(maxColNeeded, startCol + clipRow.length);
        }
        const newHeaders = [...state.data.headers];
        while (newHeaders.length < maxColNeeded) {
          newHeaders.push(`Column ${newHeaders.length + 1}`);
        }
        const colCount = newHeaders.length;

        // 既存行を新しい列数に合わせて拡張しつつディープコピー
        const newRows = state.data.rows.map(row => {
          const r = [...row];
          while (r.length < colCount) r.push('');
          return r;
        });

        // Paste clipboard data starting from target cell
        for (let clipRow = 0; clipRow < state.clipboard.length; clipRow++) {
          const targetRowIndex = startRow + clipRow;

          // Extend rows if necessary
          while (targetRowIndex >= newRows.length) {
            newRows.push(new Array(colCount).fill(''));
          }
          while (newRows[targetRowIndex].length < colCount) {
            newRows[targetRowIndex].push('');
          }

          for (let clipCol = 0; clipCol < state.clipboard[clipRow].length; clipCol++) {
            const targetColIndex = startCol + clipCol;
            if (targetColIndex < colCount) {
              newRows[targetRowIndex][targetColIndex] = state.clipboard[clipRow][clipCol];
            }
          }
        }

        const afterData = { ...state.data, headers: newHeaders, rows: newRows };

        // Add to history
        const historyAction: HistoryAction = {
          type: 'paste',
          data: {
            beforeData,
            afterData,
            selection: target
          },
          timestamp: Date.now()
        };

        set({
          data: afterData,
          hasUnsavedChanges: true
        });

        // Add to history after state update
        get().addToHistory(historyAction);
      },

      deleteSelection: () => {
        const state = get();
        if (!state.data) return;

        // Store before state for history - deep copy rows
        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };

        const newRows = [...state.data.rows];
        const selection = state.selectedCell || state.selectedRange || undefined;

        if (state.selectedCell) {
          // Delete single cell
          if (newRows[state.selectedCell.row]) {
            newRows[state.selectedCell.row] = [...newRows[state.selectedCell.row]];
            newRows[state.selectedCell.row][state.selectedCell.column] = '';
          }
        } else if (state.selectedRange) {
          // Delete range selection
          for (let row = state.selectedRange.startRow; row <= state.selectedRange.endRow; row++) {
            if (newRows[row]) {
              newRows[row] = [...newRows[row]];
              for (let col = state.selectedRange.startColumn; col <= state.selectedRange.endColumn; col++) {
                newRows[row][col] = '';
              }
            }
          }
        }

        const afterData = { ...state.data, rows: newRows };

        // Add to history
        const historyAction: HistoryAction = {
          type: 'delete',
          data: {
            beforeData,
            afterData,
            selection
          },
          timestamp: Date.now()
        };

        set({
          data: afterData,
          hasUnsavedChanges: true
        });

        // Add to history after state update
        get().addToHistory(historyAction);
      },

      // 下方向フィル（Cmd/Ctrl+D 相当）
      // 範囲選択時: 選択先頭行の値を下の行へコピー
      // 単一セル時: 直上セルの値をコピー
      fillDown: () => {
        const state = get();
        if (!state.data) return;

        const sel = state.selectedRange;
        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };
        const newRows = state.data.rows.map(row => [...row]);

        if (sel && sel.endRow > sel.startRow) {
          for (let c = sel.startColumn; c <= sel.endColumn; c++) {
            const srcVal = newRows[sel.startRow]?.[c] ?? '';
            for (let r = sel.startRow + 1; r <= sel.endRow; r++) {
              if (newRows[r]) newRows[r][c] = srcVal;
            }
          }
        } else if (state.selectedCell && state.selectedCell.row > 0) {
          const { row, column } = state.selectedCell;
          newRows[row][column] = newRows[row - 1]?.[column] ?? '';
        } else {
          return; // フィル対象なし
        }

        const afterData = { ...state.data, rows: newRows };
        set({ data: afterData, hasUnsavedChanges: true });
        get().addToHistory({
          type: 'replace_all',
          data: { beforeData, afterData, description: '下方向にフィル' },
          timestamp: Date.now()
        });
      },

      // フィルハンドルのドラッグによるフィル。
      // origin ブロック（元の選択）は保持し、拡張された新規セルのみを埋める。
      // 数値が等差数列なら系列を継続（例: 1,2,3 → 4,5,6）、それ以外は元パターンをタイル。
      fillFromHandle: (origin, target) => {
        const state = get();
        if (!state.data) return;

        const grewDown = target.endRow > origin.r2;
        const grewRight = target.endColumn > origin.c2;
        if (!grewDown && !grewRight) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };
        const newRows = state.data.rows.map(row => [...row]);

        // 元の値配列を count 個ぶん外挿する
        const extrapolate = (srcValues: string[], count: number): string[] => {
          const trimmed = srcValues.map(v => v.trim());
          const nums = trimmed.map(v => Number(v));
          const allNumeric =
            trimmed.length > 0 &&
            trimmed.every((v, i) => v !== '' && !Number.isNaN(nums[i]) && String(nums[i]) === v);

          // 2つ以上の等差数列なら系列を継続
          if (allNumeric && nums.length >= 2) {
            const delta = nums[1] - nums[0];
            const constant = nums.every(
              (n, i) => i === 0 || Math.abs(n - nums[i - 1] - delta) < 1e-9
            );
            if (constant) {
              const out: string[] = [];
              let last = nums[nums.length - 1];
              for (let k = 0; k < count; k++) {
                last += delta;
                out.push(String(last));
              }
              return out;
            }
          }

          // それ以外（単一数値/文字列/非等差）は元パターンをタイル
          return Array.from({ length: count }, (_, k) => srcValues[k % srcValues.length]);
        };

        if (grewDown) {
          const count = target.endRow - origin.r2;
          for (let c = origin.c1; c <= origin.c2; c++) {
            const src: string[] = [];
            for (let r = origin.r1; r <= origin.r2; r++) src.push(newRows[r]?.[c] ?? '');
            const filled = extrapolate(src, count);
            for (let k = 0; k < count; k++) {
              const r = origin.r2 + 1 + k;
              if (newRows[r]) newRows[r][c] = filled[k];
            }
          }
        } else if (grewRight) {
          const count = target.endColumn - origin.c2;
          for (let r = origin.r1; r <= origin.r2; r++) {
            if (!newRows[r]) continue;
            const src: string[] = [];
            for (let c = origin.c1; c <= origin.c2; c++) src.push(newRows[r][c] ?? '');
            const filled = extrapolate(src, count);
            for (let k = 0; k < count; k++) {
              newRows[r][origin.c2 + 1 + k] = filled[k];
            }
          }
        }

        const afterData = { ...state.data, rows: newRows };
        set({ data: afterData, hasUnsavedChanges: true });
        get().addToHistory({
          type: 'replace_all',
          data: {
            beforeData,
            afterData,
            description: grewDown ? '下方向にフィル' : '右方向にフィル'
          },
          timestamp: Date.now()
        });
      },

      // History operations
      addToHistory: (action) => {
        const state = get();
        // ラベルが無ければ自動付与（履歴パネル表示用）
        const labeledAction: HistoryAction = {
          ...action,
          label: action.label ?? describeHistoryAction(action),
        };

        const newHistory = state.history.slice(0, state.historyIndex + 1);
        newHistory.push(labeledAction);

        // Limit history size to prevent memory issues
        const MAX_HISTORY_SIZE = 100;
        if (newHistory.length > MAX_HISTORY_SIZE) {
          newHistory.shift();
        }

        set({
          history: newHistory,
          historyIndex: newHistory.length - 1
        });
      },

      undo: () => {
        const state = get();
        if (state.historyIndex < 0) return;

        const action = state.history[state.historyIndex];
        if (action) {
          set({
            data: action.data.beforeData,
            historyIndex: state.historyIndex - 1,
            hasUnsavedChanges: true
          });
        }
      },

      redo: () => {
        const state = get();
        if (state.historyIndex >= state.history.length - 1) return;

        const action = state.history[state.historyIndex + 1];
        if (action) {
          set({
            data: action.data.afterData,
            historyIndex: state.historyIndex + 1,
            hasUnsavedChanges: true
          });
        }
      },

      canUndo: () => {
        const state = get();
        return state.historyIndex >= 0;
      },

      canRedo: () => {
        const state = get();
        return state.historyIndex < state.history.length - 1;
      },

      // 履歴の任意地点へジャンプ（履歴パネルから呼ぶ）
      // targetIndex === -1 は「最初の状態」（最古アクションの beforeData）を意味する
      jumpToHistory: (targetIndex) => {
        const state = get();
        if (state.history.length === 0) return;

        // 範囲を [-1, history.length - 1] にクランプ
        const clamped = Math.max(-1, Math.min(targetIndex, state.history.length - 1));

        const targetData =
          clamped < 0
            ? state.history[0]?.data.beforeData
            : state.history[clamped]?.data.afterData;

        if (!targetData) return;

        set({
          data: targetData,
          historyIndex: clamped,
          hasUnsavedChanges: true,
          // ジャンプ後は選択がずれる可能性があるためクリア
          selectedCell: null,
          selectedRange: null,
          editingCell: null,
        });
      },

      // Row operations with history
      addRow: (position, rowIndex) => {
        const state = get();
        if (!state.data) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };
        const newRows = [...state.data.rows];
        const newRow = new Array(state.data.headers.length).fill('');

        // Handle empty table case
        let insertIndex: number;
        if (state.data.rows.length === 0) {
          // If table is empty, always insert at index 0
          insertIndex = 0;
        } else if (rowIndex === undefined) {
          // If rowIndex is not provided, append to the end
          insertIndex = state.data.rows.length;
        } else {
          // Normal case: insert above or below the specified row
          insertIndex = position === 'above' ? rowIndex : rowIndex + 1;
        }
        newRows.splice(insertIndex, 0, newRow);

        const afterData = {
          ...state.data,
          rows: newRows
        };

        const historyAction: HistoryAction = {
          type: 'add_row',
          data: {
            beforeData,
            afterData,
            selection: { row: insertIndex, column: 0, value: '' }
          },
          timestamp: Date.now()
        };

        set({
          data: afterData,
          hasUnsavedChanges: true
        });

        get().addToHistory(historyAction);
      },

      // 複数行をまとめて挿入（Excel挙動: N行選択 → N行挿入）
      insertRows: (position, rowIndex, count) => {
        const state = get();
        if (!state.data || count <= 0) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };
        const newRows = [...state.data.rows];
        const newBlankRows = Array.from({ length: count }, () =>
          new Array(state.data!.headers.length).fill('')
        );

        let insertIndex: number;
        if (state.data.rows.length === 0) {
          insertIndex = 0;
        } else {
          insertIndex = position === 'above' ? rowIndex : rowIndex + 1;
        }
        newRows.splice(insertIndex, 0, ...newBlankRows);

        const afterData = { ...state.data, rows: newRows };

        set({ data: afterData, hasUnsavedChanges: true });

        get().addToHistory({
          type: 'insert_rows',
          data: {
            beforeData,
            afterData,
            selection: { row: insertIndex, column: 0, value: '' },
            description: `${count}行を挿入`
          },
          timestamp: Date.now()
        });
      },

      deleteRow: (rowIndex) => {
        const state = get();
        if (!state.data) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };
        const newRows = [...state.data.rows];
        newRows.splice(rowIndex, 1);

        const afterData = {
          ...state.data,
          rows: newRows
        };

        const historyAction: HistoryAction = {
          type: 'delete_row',
          data: {
            beforeData,
            afterData,
            selection: { row: rowIndex, column: 0, value: '' }
          },
          timestamp: Date.now()
        };

        set({
          data: afterData,
          hasUnsavedChanges: true
        });

        get().addToHistory(historyAction);
      },

      // 複数行をまとめて削除（確認ダイアログなし・Undo可能）
      deleteRows: (rowIndices) => {
        const state = get();
        if (!state.data || rowIndices.length === 0) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };

        // 重複排除 & 降順ソートしてから splice することで index ズレを防ぐ
        const sorted = [...new Set(rowIndices)].sort((a, b) => b - a);
        const newRows = [...state.data.rows];
        sorted.forEach(i => {
          if (i >= 0 && i < newRows.length) newRows.splice(i, 1);
        });

        const afterData = { ...state.data, rows: newRows };

        set({
          data: afterData,
          hasUnsavedChanges: true,
          selectedRange: null,
          selectedCell: null,
        });

        get().addToHistory({
          type: 'delete_rows',
          data: {
            beforeData,
            afterData,
            description: `${sorted.length}行を削除`
          },
          timestamp: Date.now()
        });
      },

      // 現在の行選択（type: 'row'）をまとめて削除
      deleteSelectedRows: () => {
        const state = get();
        const sel = state.selectedRange;
        if (sel?.type !== 'row') return;
        const indices: number[] = [];
        for (let i = sel.startRow; i <= sel.endRow; i++) indices.push(i);
        get().deleteRows(indices);
      },

      duplicateRow: (rowIndex) => {
        const state = get();
        if (!state.data || !state.data.rows[rowIndex]) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };
        const newRows = [...state.data.rows];
        const duplicatedRow = [...state.data.rows[rowIndex]];
        newRows.splice(rowIndex + 1, 0, duplicatedRow);

        const afterData = {
          ...state.data,
          rows: newRows
        };

        const historyAction: HistoryAction = {
          type: 'duplicate_row',
          data: {
            beforeData,
            afterData,
            selection: { row: rowIndex + 1, column: 0, value: '' }
          },
          timestamp: Date.now()
        };

        set({
          data: afterData,
          hasUnsavedChanges: true
        });

        get().addToHistory(historyAction);
      },

      // Column operations with history
      addColumn: (position, columnIndex) => {
        const state = get();
        if (!state.data) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };
        const insertIndex = position === 'before' ? columnIndex : columnIndex + 1;

        const newHeaders = [...state.data.headers];
        newHeaders.splice(insertIndex, 0, `Column ${state.data.headers.length + 1}`);

        const newRows = state.data.rows.map(row => {
          const newRow = [...row];
          newRow.splice(insertIndex, 0, '');
          return newRow;
        });

        const afterData = {
          ...state.data,
          headers: newHeaders,
          rows: newRows
        };

        const historyAction: HistoryAction = {
          type: 'add_column',
          data: {
            beforeData,
            afterData,
            selection: { row: 0, column: insertIndex, value: '' }
          },
          timestamp: Date.now()
        };

        set({
          data: afterData,
          hasUnsavedChanges: true
        });

        get().addToHistory(historyAction);
      },

      // 複数列をまとめて挿入
      insertColumns: (position, columnIndex, count) => {
        const state = get();
        if (!state.data || count <= 0) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };
        const insertIndex = position === 'before' ? columnIndex : columnIndex + 1;

        const baseCount = state.data.headers.length;
        const newColumnNames = Array.from({ length: count }, (_, i) => `Column ${baseCount + i + 1}`);

        const newHeaders = [...state.data.headers];
        newHeaders.splice(insertIndex, 0, ...newColumnNames);

        const blanks = new Array(count).fill('');
        const newRows = state.data.rows.map(row => {
          const newRow = [...row];
          newRow.splice(insertIndex, 0, ...blanks);
          return newRow;
        });

        const afterData = { ...state.data, headers: newHeaders, rows: newRows };

        set({ data: afterData, hasUnsavedChanges: true });

        get().addToHistory({
          type: 'insert_columns',
          data: {
            beforeData,
            afterData,
            selection: { row: 0, column: insertIndex, value: '' },
            description: `${count}列を挿入`
          },
          timestamp: Date.now()
        });
      },

      deleteColumn: (columnIndex) => {
        const state = get();
        if (!state.data) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };

        const newHeaders = [...state.data.headers];
        newHeaders.splice(columnIndex, 1);

        const newRows = state.data.rows.map(row => {
          const newRow = [...row];
          newRow.splice(columnIndex, 1);
          return newRow;
        });

        const afterData = {
          ...state.data,
          headers: newHeaders,
          rows: newRows
        };

        const historyAction: HistoryAction = {
          type: 'delete_column',
          data: {
            beforeData,
            afterData,
            selection: { row: 0, column: Math.max(0, columnIndex - 1), value: '' }
          },
          timestamp: Date.now()
        };

        set({
          data: afterData,
          hasUnsavedChanges: true
        });

        get().addToHistory(historyAction);
      },

      // 複数列をまとめて削除（確認ダイアログなし・Undo可能）
      deleteColumns: (columnIndices) => {
        const state = get();
        if (!state.data || columnIndices.length === 0) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };

        // 重複排除 & 降順ソートしてから splice することで index ズレを防ぐ
        const sorted = [...new Set(columnIndices)].sort((a, b) => b - a);

        const newHeaders = [...state.data.headers];
        sorted.forEach(i => {
          if (i >= 0 && i < newHeaders.length) newHeaders.splice(i, 1);
        });

        const newRows = state.data.rows.map(row => {
          const newRow = [...row];
          sorted.forEach(i => {
            if (i >= 0 && i < newRow.length) newRow.splice(i, 1);
          });
          return newRow;
        });

        const afterData = { ...state.data, headers: newHeaders, rows: newRows };

        set({
          data: afterData,
          hasUnsavedChanges: true,
          selectedRange: null,
          selectedCell: null,
        });

        get().addToHistory({
          type: 'delete_columns',
          data: {
            beforeData,
            afterData,
            description: `${sorted.length}列を削除`
          },
          timestamp: Date.now()
        });
      },

      // 現在の列選択（type: 'column'）をまとめて削除
      deleteSelectedColumns: () => {
        const state = get();
        const sel = state.selectedRange;
        if (sel?.type !== 'column') return;
        const indices: number[] = [];
        for (let i = sel.startColumn; i <= sel.endColumn; i++) indices.push(i);
        get().deleteColumns(indices);
      },

      renameColumn: (columnIndex, newName) => {
        const state = get();
        if (!state.data) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };

        const newHeaders = [...state.data.headers];
        newHeaders[columnIndex] = newName;

        const afterData = {
          ...state.data,
          headers: newHeaders
        };

        const historyAction: HistoryAction = {
          type: 'rename_column',
          data: {
            beforeData,
            afterData,
            selection: { row: 0, column: columnIndex, value: newName }
          },
          timestamp: Date.now()
        };

        set({
          data: afterData,
          hasUnsavedChanges: true
        });

        get().addToHistory(historyAction);
      },

      // Batch operations with history
      replaceAll: (newData, description) => {
        const state = get();
        if (!state.data) return;

        const beforeData = {
          ...state.data,
          rows: state.data.rows.map(row => [...row])
        };

        const historyAction: HistoryAction = {
          type: 'replace_all',
          data: {
            beforeData,
            afterData: newData,
            description: description || 'Replace all'
          },
          timestamp: Date.now()
        };

        set({
          data: newData,
          hasUnsavedChanges: true
        });

        get().addToHistory(historyAction);
      },

      // Column width operations
      setColumnWidth: async (columnIndex, width) => {
        const state = get();
        const newColumnWidths = {
          ...state.columnWidths,
          [columnIndex]: width
        };
        set({ columnWidths: newColumnWidths });

        // Auto-save view state
        if (state.currentFilePath) {
          try {
            const { tauriAPI } = await import('../hooks/useTauri');
            await tauriAPI.saveViewState(state.currentFilePath, {
              columnWidths: newColumnWidths,
              viewportRange: state.viewportRange,
              defaultColumnWidth: state.defaultColumnWidth,
            });
          } catch (error) {
            console.warn('Failed to save view state:', error);
          }
        }
      },

      getColumnWidth: (columnIndex) => {
        const state = get();
        return state.columnWidths[columnIndex] || state.defaultColumnWidth;
      },

      resetColumnWidths: () => {
        set({ columnWidths: {} });
      },

      setWrapText: (wrap) => set({ wrapText: wrap }),
      toggleWrapText: () => set((state) => ({ wrapText: !state.wrapText })),

      // Search operations
      setSearchQuery: (query, options) => {
        set((state) => ({
          searchQuery: query,
          searchOptions: options ? { ...state.searchOptions, ...options } : state.searchOptions,
        }));
      },

      performSearch: () => {
        const state = get();
        const { data, searchQuery, searchOptions } = state;

        if (!data || !searchQuery || searchQuery.trim() === '') {
          set({ searchResults: [], currentSearchIndex: -1 });
          return;
        }

        const results: CsvCell[] = [];
        const { caseSensitive, wholeWord, regex, columnIndex } = searchOptions;

        // Build search regex if needed
        let searchRegex: RegExp | null = null;
        if (regex) {
          try {
            searchRegex = new RegExp(searchQuery, caseSensitive ? 'g' : 'gi');
          } catch (e) {
            console.error('Invalid regex:', e);
            return;
          }
        }

        // Search through all rows and columns
        data.rows.forEach((row, rowIndex) => {
          const columnsToSearch = columnIndex !== undefined ? [columnIndex] : row.map((_, idx) => idx);

          columnsToSearch.forEach((colIdx) => {
            const value = row[colIdx] || '';
            let matches = false;

            if (searchRegex) {
              matches = searchRegex.test(value);
            } else if (wholeWord) {
              const searchText = caseSensitive ? searchQuery : searchQuery.toLowerCase();
              const cellValue = caseSensitive ? value : value.toLowerCase();
              matches = cellValue.split(/\s+/).some(word => word === searchText);
            } else {
              const searchText = caseSensitive ? searchQuery : searchQuery.toLowerCase();
              const cellValue = caseSensitive ? value : value.toLowerCase();
              matches = cellValue.includes(searchText);
            }

            if (matches) {
              results.push({ row: rowIndex, column: colIdx, value });
            }
          });
        });

        set({
          searchResults: results,
          currentSearchIndex: results.length > 0 ? 0 : -1,
        });

        // Navigate to first result
        if (results.length > 0) {
          const firstResult = results[0];
          get().selectCell(firstResult);

          // Scroll to the first result if callback is registered
          const { scrollToCell } = get();
          if (scrollToCell) {
            scrollToCell(firstResult.row, firstResult.column);
          }
        }
      },

      clearSearch: () => {
        set({
          searchResults: [],
          currentSearchIndex: -1,
          searchQuery: '',
        });
      },

      nextSearchResult: () => {
        const { searchResults, currentSearchIndex, scrollToCell } = get();
        if (searchResults.length === 0) return;

        const nextIndex = (currentSearchIndex + 1) % searchResults.length;
        set({ currentSearchIndex: nextIndex });
        const nextResult = searchResults[nextIndex];
        get().selectCell(nextResult);

        // Scroll to the cell if callback is registered
        if (scrollToCell) {
          scrollToCell(nextResult.row, nextResult.column);
        }
      },

      previousSearchResult: () => {
        const { searchResults, currentSearchIndex, scrollToCell } = get();
        if (searchResults.length === 0) return;

        const prevIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
        set({ currentSearchIndex: prevIndex });
        const prevResult = searchResults[prevIndex];
        get().selectCell(prevResult);

        // Scroll to the cell if callback is registered
        if (scrollToCell) {
          scrollToCell(prevResult.row, prevResult.column);
        }
      },

      replaceCurrentResult: (replaceText: string) => {
        const { searchResults, currentSearchIndex, data, searchQuery, searchOptions } = get();
        if (!data || searchResults.length === 0 || currentSearchIndex < 0) return;

        const currentResult = searchResults[currentSearchIndex];
        const { row, column, value } = currentResult;

        // Save state for undo
        const beforeData = JSON.parse(JSON.stringify(data));

        // Perform replacement - replace only the matched part
        const newData = { ...data };
        newData.rows = [...data.rows];
        newData.rows[row] = [...data.rows[row]];

        let newValue = value;
        const { caseSensitive, wholeWord, regex } = searchOptions;

        if (regex) {
          // Use regex replacement
          try {
            const re = new RegExp(searchQuery, caseSensitive ? 'g' : 'gi');
            newValue = value.replace(re, replaceText);
          } catch (e) {
            console.error('Invalid regex:', e);
            return;
          }
        } else if (wholeWord) {
          // Replace whole word only
          const words = value.split(/(\s+)/); // Keep whitespace
          const searchText = caseSensitive ? searchQuery : searchQuery.toLowerCase();
          newValue = words.map(word => {
            const compareWord = caseSensitive ? word : word.toLowerCase();
            return compareWord === searchText ? replaceText : word;
          }).join('');
        } else {
          // Simple partial match replacement
          if (caseSensitive) {
            newValue = value.replace(searchQuery, replaceText);
          } else {
            const index = value.toLowerCase().indexOf(searchQuery.toLowerCase());
            if (index !== -1) {
              newValue = value.substring(0, index) + replaceText + value.substring(index + searchQuery.length);
            }
          }
        }

        newData.rows[row][column] = newValue;

        // Add to history
        get().addToHistory({
          type: 'replace_current',
          data: {
            beforeData,
            afterData: newData,
            description: 'Replace text',
          },
          timestamp: Date.now(),
        });

        set({
          data: newData,
          hasUnsavedChanges: true,
        });

        // Move to next result
        get().nextSearchResult();
      },

      replaceAllResults: (replaceText: string) => {
        const { searchResults, data, searchQuery, searchOptions } = get();
        if (!data || searchResults.length === 0) return;

        // Save state for undo
        const beforeData = JSON.parse(JSON.stringify(data));

        // Perform all replacements
        const newData = { ...data };
        newData.rows = data.rows.map(row => [...row]);

        const { caseSensitive, wholeWord, regex } = searchOptions;

        searchResults.forEach(result => {
          const { row, column, value } = result;
          let newValue = value;

          if (regex) {
            // Use regex replacement
            try {
              const re = new RegExp(searchQuery, caseSensitive ? 'g' : 'gi');
              newValue = value.replace(re, replaceText);
            } catch (e) {
              console.error('Invalid regex:', e);
              return;
            }
          } else if (wholeWord) {
            // Replace whole word only
            const words = value.split(/(\s+)/); // Keep whitespace
            const searchText = caseSensitive ? searchQuery : searchQuery.toLowerCase();
            newValue = words.map(word => {
              const compareWord = caseSensitive ? word : word.toLowerCase();
              return compareWord === searchText ? replaceText : word;
            }).join('');
          } else {
            // Simple partial match replacement - replace first occurrence
            if (caseSensitive) {
              newValue = value.replace(searchQuery, replaceText);
            } else {
              const index = value.toLowerCase().indexOf(searchQuery.toLowerCase());
              if (index !== -1) {
                newValue = value.substring(0, index) + replaceText + value.substring(index + searchQuery.length);
              }
            }
          }

          newData.rows[row][column] = newValue;
        });

        // Add to history
        get().addToHistory({
          type: 'replace_all',
          data: {
            beforeData,
            afterData: newData,
            description: `Replace all (${searchResults.length} occurrences)`,
          },
          timestamp: Date.now(),
        });

        set({
          data: newData,
          hasUnsavedChanges: true,
        });

        // Clear search after replacing all
        get().clearSearch();
      },

      setScrollToCell: (callback) => set({ scrollToCell: callback }),

      // AI Assistant actions
      addAiMessage: (message) => {
        const state = get();
        set({ aiMessages: [...state.aiMessages, message] });
      },

      setAiPendingChanges: (changes) => set({ aiPendingChanges: changes }),

      clearAiMessages: () => set({ aiMessages: [], aiPendingChanges: null }),

      markSaved: () => set({ hasUnsavedChanges: false }),

      reset: () => set({
        data: null,
        currentFilePath: null,
        isLoading: false,
        error: null,
        selectedCell: null,
        selectedRange: null,
        editingCell: null,
        hasUnsavedChanges: false,
        clipboard: null,
        filters: [],
        sorts: [],
        history: [],
        historyIndex: -1,
        viewportRange: {
          startRow: 0,
          endRow: 50,
          startColumn: 0,
          endColumn: 10
        },
        columnWidths: {},
        defaultColumnWidth: 150,
        wrapText: false,
        currentSort: { columns: [] },
        aiMessages: [],
        aiPendingChanges: null,
        cellValidationErrors: {}
      }),

      createNewCsv: () => {
        const newData: CsvData = {
          headers: ['Column 1'],
          rows: [['']], // デフォルトで1行を追加
          metadata: {
            filename: 'Untitled',
            path: '',
            rowCount: 1,
            columnCount: 1,
            hasHeaders: true,
            delimiter: ',',
            encoding: 'UTF-8',
            fileSize: 0,
            lastModified: new Date().toISOString()
          }
        };
        const firstCell: CsvCell = {
          row: 0,
          column: 0,
          value: ''
        };
        set({
          data: newData,
          currentFilePath: null,
          error: null,
          selectedCell: firstCell,
          selectedRange: null,
          editingCell: firstCell, // 最初のセルを編集モードにする
          hasUnsavedChanges: true,
          filters: [],
          sorts: [],
          currentSort: { columns: [] },
          history: [],
          historyIndex: -1,
          searchResults: [],
          currentSearchIndex: -1,
          searchQuery: '',
          columnWidths: {}
        });
      }
    }),
    { name: 'csv-store' }
  )
);