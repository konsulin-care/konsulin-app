/**
 *
 */
export default function Tags({ tags }: Readonly<{ tags: string[] }>) {
  return (
    <div className='flex flex-wrap gap-2'>
      {tags?.map(tag => (
        <div
          key={tag}
          className='bg-muted text-foreground flex items-center rounded-full px-2 py-1 text-xs font-normal'
        >
          {tag}
        </div>
      ))}
    </div>
  );
}
