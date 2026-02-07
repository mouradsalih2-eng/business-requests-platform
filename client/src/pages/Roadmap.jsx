import { Layout } from '../components/layout/Layout';
import { KanbanBoard } from '../components/roadmap/KanbanBoard';
import { useFeatureFlag } from '../context/FeatureFlagContext';

export function Roadmap() {
  const roadmapEnabled = useFeatureFlag('roadmap_kanban');

  return (
    <Layout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-lg font-semibold text-neutral-900 dark:text-[#E6EDF3]">Roadmap</h1>
          <p className="text-sm text-neutral-500 dark:text-[#8B949E]">
            Track feature progress across development stages
          </p>
        </div>

        {roadmapEnabled ? (
          <KanbanBoard />
        ) : (
          <div className="text-center py-16 text-neutral-500 dark:text-[#8B949E]">
            <p className="text-sm">Roadmap is currently disabled.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
