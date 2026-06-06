import { useJoinCluster } from '@/hooks/useApiQueries';
import { Button } from '@/components/ui/button';
import { useNavigate, useParams } from 'react-router';

export default function JoinPage() {
  const { invitationId } = useParams<{ invitationId: string }>();
  const navigate = useNavigate();
  const { mutate: joinCluster, isPending, isError } = useJoinCluster();

  const handleJoin = () => {
    if (!invitationId) return;
    joinCluster(invitationId, {
      onSuccess: () => navigate('/chat'),
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-base px-4">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-lg border border-border bg-elevated p-8">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-text-primary">
            You've been invited
          </h1>
          <p className="text-sm text-text-secondary">
            Click below to join the cluster.
          </p>
        </div>

        {isError && (
          <p className="text-sm text-danger">
            Invalid or expired invitation link.
          </p>
        )}

        <Button intent="primary" disabled={isPending} onClick={handleJoin}>
          {isPending ? 'Joining…' : 'Join cluster'}
        </Button>
      </div>
    </div>
  );
}
