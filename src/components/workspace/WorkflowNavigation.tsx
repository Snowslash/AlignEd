import { Button } from '@/components/ui/button';
import { workspaceStages, type WorkspaceStageId } from './workspace-types';

interface WorkflowNavigationProps {
  currentStage: WorkspaceStageId;
  onChange: (stage: WorkspaceStageId) => void;
}

export function WorkflowNavigation({ currentStage, onChange }: WorkflowNavigationProps) {
  return (
    <nav aria-label="Teaching evidence workflow" className="flex flex-wrap gap-2" data-print-hidden data-workflow-navigation>
      {workspaceStages.map((stage) => (
        <Button
          aria-current={currentStage === stage.id ? 'step' : undefined}
          key={stage.id}
          onClick={() => onChange(stage.id)}
          type="button"
          variant={currentStage === stage.id ? 'default' : 'outline'}
        >
          {stage.label}
        </Button>
      ))}
    </nav>
  );
}
