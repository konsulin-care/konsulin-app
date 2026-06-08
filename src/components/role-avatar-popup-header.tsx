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
        <div className='text-xs font-normal text-[#2c2f35]'>{indicator}</div>
      )}
      {displayName && (
        <div className='text-sm font-bold text-[#2c2f35]'>{displayName}</div>
      )}
    </div>
  );
}
