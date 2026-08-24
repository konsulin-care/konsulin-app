'use client';

import { LoadingSpinnerIcon } from '@/components/icons';
import AppDrawer from '@/components/ui/app-drawer';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface SpecialtyPickerModalProps {
  specialties: string[];
  loading: boolean;
}

/**
 * Specialty picker shown when `/recommendation` is visited without intent
 * params. Selecting a specialty navigates to the filtered results page.
 */
export default function SpecialtyPickerModal({
  specialties,
  loading
}: SpecialtyPickerModalProps) {
  const router = useRouter();

  const selectSpecialty = (code: string) => {
    // skipcq: JS-D1001 — self-explanatory handler
    router.replace(`/recommendation?specialty=${encodeURIComponent(code)}`);
  };

  return (
    <AppDrawer
      open
      onClose={() => {
        router.push('/');
      }}
      title='Pilih Spesialisasi'
      description='Lihat rekomendasi layanan kesehatan sesuai kebutuhan Anda.'
    >
      {loading ? (
        <div className='flex min-h-[200px] items-center justify-center'>
          <LoadingSpinnerIcon
            width={36}
            height={36}
            className='w-full animate-spin'
          />
        </div>
      ) : (
        <div className='flex max-h-[55dvh] flex-col gap-2 overflow-y-auto pb-4'>
          {specialties.map(specialty => (
            <button
              key={specialty}
              type='button'
              onClick={() => {
                selectSpecialty(specialty);
              }}
              className={cn(
                'border-input rounded-xl border p-4 text-left text-sm transition-colors',
                'hover:border-primary/40 active:bg-primary/5'
              )}
            >
              {specialty}
            </button>
          ))}
        </div>
      )}
    </AppDrawer>
  );
}
