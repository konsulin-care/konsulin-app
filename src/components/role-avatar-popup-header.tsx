/**
 *
 */
export function HeaderText({
  indicator,
  displayName
}: Readonly<{
  indicator?: string;
  displayName?: string;
}>) {
  return (
    <div className='flex flex-col text-right'>
      {indicator && (
        <div className='text-foreground text-xs font-normal'>{indicator}</div>
      )}
      {displayName && (
        <div className='text-foreground text-sm font-bold'>{displayName}</div>
      )}
    </div>
  );
}
