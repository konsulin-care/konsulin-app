'use client';

import {
  BaseRenderer,
  useRendererQueryClient
} from '@aehrc/smart-forms-renderer';
import { QueryClientProvider } from '@tanstack/react-query';

export function SmartFormShell({
  className,
  onChange
}: {
  className: string;
  onChange?: React.ChangeEventHandler<HTMLDivElement>;
}) {
  const queryClient = useRendererQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <div className={className} onChange={onChange}>
        <BaseRenderer />
      </div>
    </QueryClientProvider>
  );
}
