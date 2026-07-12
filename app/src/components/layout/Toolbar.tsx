import { useCallback, useState } from 'react';
import {
  FolderOpen,
  Save,
  SaveAll,
  Undo,
  Redo,
  Search,
  Settings,
  Shield,
  CheckSquare,
  BarChart3,
  FileDown,
  FilePlus,
  WrapText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useCsvStore } from '../../store/csvStore';
import { useTauri } from '../../hooks/useTauri';
import { DataTypeDetection } from '../DataTypeDetection';
import { HistoryPanel } from '../HistoryPanel';
import { SearchReplace } from '../SearchReplace';
import { ImportExportSettings } from '../ImportExportSettings';
import { SortMenu } from '../SortMenu';
import { CustomValidation } from '../CustomValidation';
import { DataQuality } from '../DataQuality';
import { ExportDialog } from '../ExportDialog';

interface ToolbarProps {
  onSave?: () => void;
  onSaveAs?: () => void;
  onOpenSearch?: () => void;
  onNewCsv?: () => void;
}

export function Toolbar({ onSave, onSaveAs, onOpenSearch, onNewCsv }: ToolbarProps = {}) {
  const {
    data,
    hasUnsavedChanges,
    setLoading,
    setData,
    setCurrentFilePath,
    setError,
    undo,
    redo,
    canUndo,
    canRedo,
    replaceAll,
    currentSort,
    applySorting,
    clearSorting,
    wrapText,
    toggleWrapText
  } = useCsvStore();
  const tauri = useTauri();

  // Dialog states
  const [isDataTypeDialogOpen, setIsDataTypeDialogOpen] = useState(false);
  const [isSearchReplaceDialogOpen, setIsSearchReplaceDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [isCustomValidationOpen, setIsCustomValidationOpen] = useState(false);
  const [isDataQualityOpen, setIsDataQualityOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);

  const handleOpenFile = async () => {
    try {
      setLoading(true);
      const filePath = await tauri.openFileDialog();

      if (filePath) {
        const csvData = await tauri.openCsvFile(filePath);
        setData(csvData, filePath);
        setCurrentFilePath(filePath);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to open file');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFile = useCallback(() => {
    if (onSave) {
      onSave();
    }
  }, [onSave]);

  const handleSaveAsFile = useCallback(() => {
    if (onSaveAs) {
      onSaveAs();
    }
  }, [onSaveAs]);

  return (
    <div className="flex items-center justify-between px-2 md:px-4 py-2 bg-background border-b border-border overflow-hidden min-w-0">
      <div className="flex items-center space-x-1 md:space-x-2 min-w-0 flex-shrink">
        {/* File Operations */}
        <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-border pr-1 md:pr-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onNewCsv || (() => {})}
            className="flex items-center space-x-1 px-1.5 md:px-2"
            title="New CSV (⌘N)"
          >
            <FilePlus className="h-4 w-4 flex-shrink-0" />
            <span className="hidden lg:inline">New</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenFile}
            className="flex items-center space-x-1 px-1.5 md:px-2"
            title="Open File (⌘O)"
          >
            <FolderOpen className="h-4 w-4 flex-shrink-0" />
            <span className="hidden lg:inline">Open</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveFile}
            disabled={!data || !hasUnsavedChanges}
            className="flex items-center space-x-1 px-1.5 md:px-2"
            title="Save (⌘S)"
          >
            <Save className="h-4 w-4 flex-shrink-0" />
            <span className="hidden lg:inline">Save</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleSaveAsFile}
            disabled={!data}
            className="flex items-center space-x-1 px-1.5 md:px-2 hidden md:flex"
            title="Save As... (⌘⇧S)"
          >
            <SaveAll className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xl:inline">Save As</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExportDialogOpen(true)}
            disabled={!data}
            className="flex items-center space-x-1 px-1.5 md:px-2 hidden md:flex"
            title="Export to other formats"
          >
            <FileDown className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xl:inline">Export</span>
          </Button>
        </div>

        {/* Edit Operations */}
        <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-border pr-1 md:pr-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!canUndo}
            onClick={undo}
            className="flex items-center space-x-1 px-1.5 md:px-2"
            title="Undo (⌘Z)"
          >
            <Undo className="h-4 w-4 flex-shrink-0" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={!canRedo}
            onClick={redo}
            className="flex items-center space-x-1 px-1.5 md:px-2"
            title="Redo (⌘⇧Z)"
          >
            <Redo className="h-4 w-4 flex-shrink-0" />
          </Button>

          <div className="hidden md:block">
            <HistoryPanel />
          </div>
        </div>

        {/* Data Operations */}
        <div className="flex items-center space-x-0.5 md:space-x-1 border-r border-border pr-1 md:pr-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={!data}
            onClick={() => onOpenSearch && onOpenSearch()}
            className="flex items-center space-x-1 px-1.5 md:px-2"
            title="Find (⌘F)"
          >
            <Search className="h-4 w-4 flex-shrink-0" />
            <span className="hidden xl:inline">Find</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={!data}
            onClick={() => setIsDataTypeDialogOpen(true)}
            className="flex items-center space-x-1 px-1.5 md:px-2 hidden lg:flex"
            title="Data Type Detection"
          >
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span className="hidden 2xl:inline">Types</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={!data}
            onClick={() => setIsCustomValidationOpen(true)}
            className="flex items-center space-x-1 px-1.5 md:px-2 hidden lg:flex"
            title="Custom Validation Rules"
          >
            <CheckSquare className="h-4 w-4 flex-shrink-0" />
            <span className="hidden 2xl:inline">Rules</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={!data}
            onClick={() => setIsDataQualityOpen(true)}
            className="flex items-center space-x-1 px-1.5 md:px-2 hidden lg:flex"
            title="Data Quality Analysis"
          >
            <BarChart3 className="h-4 w-4 flex-shrink-0" />
            <span className="hidden 2xl:inline">Quality</span>
          </Button>

          {data && (
            <div className="hidden md:block">
              <SortMenu
                headers={data.headers}
                currentSort={currentSort}
                onSortChange={applySorting}
                onClearSort={clearSorting}
              />
            </div>
          )}
        </div>
      </div>

      {/* Settings */}
      <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
        <Button
          variant={wrapText ? "default" : "ghost"}
          size="sm"
          disabled={!data}
          onClick={toggleWrapText}
          className="flex items-center space-x-1 px-1.5 md:px-2"
          title={wrapText ? "折り返し表示: ON" : "折り返し表示: OFF"}
          aria-pressed={wrapText}
        >
          <WrapText className="h-4 w-4 flex-shrink-0" />
          <span className="hidden lg:inline">Wrap</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsSettingsDialogOpen(true)}
          className="flex items-center space-x-1 px-1.5 md:px-2"
          title="Import/Export Settings"
        >
          <Settings className="h-4 w-4 flex-shrink-0" />
        </Button>
      </div>

      {/* Dialogs */}
      {data && (
        <>
          <DataTypeDetection
            isOpen={isDataTypeDialogOpen}
            onClose={() => setIsDataTypeDialogOpen(false)}
            csvData={data}
          />
          <SearchReplace
            isOpen={isSearchReplaceDialogOpen}
            onClose={() => setIsSearchReplaceDialogOpen(false)}
            csvData={data}
            onDataChange={(newData) => replaceAll(newData, 'Replace all occurrences')}
          />
          <CustomValidation
            isOpen={isCustomValidationOpen}
            onClose={() => setIsCustomValidationOpen(false)}
            csvData={data}
          />
          <DataQuality
            isOpen={isDataQualityOpen}
            onClose={() => setIsDataQualityOpen(false)}
            csvData={data}
            onApplyCleansing={(result) => {
              console.log('Cleansing applied:', result);
              // Reload data or update UI
            }}
          />
          <ExportDialog
            isOpen={isExportDialogOpen}
            onClose={() => setIsExportDialogOpen(false)}
            csvData={data}
            onExportComplete={() => {
              console.log('Export completed');
            }}
          />
        </>
      )}
      <ImportExportSettings
        isOpen={isSettingsDialogOpen}
        onClose={() => setIsSettingsDialogOpen(false)}
      />
    </div>
  );
}