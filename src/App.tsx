import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { InputForm } from './components/InputForm';
import { ProgressBar } from './components/ProgressBar';
import { ResultsMatrix } from './components/ResultsMatrix';
import { useCoordinator } from './hooks/useCoordinator';

const queryClient = new QueryClient();

function AppContent() {
  const { state, run } = useCoordinator();
  const isLoading = state.step > 0 && state.step < 5;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-900">Research Paper Metadata Cross-Checker</h1>
          <p className="mt-2 text-gray-500">
            Verify paper metadata across arXiv, DBLP, Google Scholar, and IEEE Xplore
          </p>
        </header>

        <InputForm onSubmit={run} isLoading={isLoading} />
        <ProgressBar step={state.step} />
        <ResultsMatrix state={state} />
      </div>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  );
}

export default App;
