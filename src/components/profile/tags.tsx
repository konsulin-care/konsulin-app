/**
 *
 */
export default function Tags({ tags }: Readonly<{ tags: string[] }>) {
  return (
    <div className='flex flex-wrap gap-2'>
      {tags?.map(tag => (
        <div
          key={tag}
          className='flex items-center rounded-full bg-[#E1E1E1] px-2 py-1 text-[10px] font-normal text-black'
        >
          {tag}
        </div>
      ))}
    </div>
  );
}
