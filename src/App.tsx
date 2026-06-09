import { PRESET_PROMPTS } from "./constants/presetPrompts";
import { useDatabaseApp } from "./hooks/useDatabaseApp";
import { AppHeader } from "./components/layout/AppHeader";
import { AppFooter } from "./components/layout/AppFooter";
import { ErrorAlert } from "./components/common/ErrorAlert";
import { ConnectionPanel } from "./components/connection/ConnectionPanel";
import { ScopeSelector } from "./components/sidebar/ScopeSelector";
import { TableDetailsPanel } from "./components/sidebar/TableDetailsPanel";
import { SqlGeneratorPanel } from "./components/sql/SqlGeneratorPanel";
import { SqlOutputPanel } from "./components/sql/SqlOutputPanel";

export default function App() {
  const app = useDatabaseApp();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 font-sans selection:bg-indigo-500 selection:text-white">
      <AppHeader
        isConnected={app.isConnected}
        isConfigOpen={app.isConfigOpen}
        onToggleConfig={() => app.setIsConfigOpen(!app.isConfigOpen)}
      />

      {app.isConfigOpen && (
        <ConnectionPanel
          dbConfig={app.dbConfig}
          isConnecting={app.isConnecting}
          onInputChange={app.handleInputChange}
          onConnect={app.handleConnect}
        />
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col md:grid md:grid-cols-12 gap-8">
        {app.errorMsg && <ErrorAlert message={app.errorMsg} />}

        <section className="md:col-span-4 flex flex-col space-y-6">
          <ScopeSelector
            isConnected={app.isConnected}
            isConnecting={app.isConnecting}
            databases={app.databases}
            selectedDatabase={app.selectedDatabase}
            tables={app.tables}
            selectedTable={app.selectedTable}
            onDatabaseChange={app.handleDbChange}
            onTableChange={app.handleTableChange}
          />

          <TableDetailsPanel
            activeTab={app.activeTab}
            onTabChange={app.setActiveTab}
            selectedTable={app.selectedTable}
            columns={app.columns}
            previewRows={app.previewRows}
            isLoadingSchema={app.isLoadingSchema}
          />
        </section>

        <section className="md:col-span-8 flex flex-col space-y-6">
          <SqlGeneratorPanel
            selectedTable={app.selectedTable}
            presetPrompts={PRESET_PROMPTS}
            promptInput={app.promptInput}
            isGenerating={app.isGenerating}
            onPromptChange={app.setPromptInput}
            onPresetClick={app.handlePresetClick}
            onGenerate={() => app.generateSql()}
          />

          <SqlOutputPanel
            generatedSql={app.generatedSql}
            sqlExplanation={app.sqlExplanation}
            sqlSuggestions={app.sqlSuggestions}
            copied={app.copied}
            isExecutingQuery={app.isExecutingQuery}
            isQueryExecuted={app.isQueryExecuted}
            queryRows={app.queryRows}
            queryCount={app.queryCount}
            queryError={app.queryError}
            onCopy={app.copyToClipboard}
            onExecute={app.executeGeneratedSql}
          />
        </section>
      </main>

      <AppFooter />
    </div>
  );
}
