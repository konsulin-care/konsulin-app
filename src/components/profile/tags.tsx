export default function Tags({ tags }) {
  return (
    <div className='flex w-full flex-grow flex-wrap items-start gap-2 pt-2'>
      {tags &&
        tags.map((tag: any) => (
          <div
            key={tag}
            className='inline-block space-x-2 space-y-[2px] rounded-full bg-gray-200 px-2 py-[2px] text-[10px] text-black'
          >
            {tag}
          </div>
        ))}
    </div>
  )
}
