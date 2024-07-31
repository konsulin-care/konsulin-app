export default function Tags({ tags }) {
  return (
    <div className='flex w-full flex-grow flex-wrap items-center gap-[10px] pt-[16px]'>
      {tags &&
        tags.map((tag: any) => (
          <div
            key={tag}
            className='inline-block space-x-2 space-y-[2px] rounded-full bg-[#E1E1E1] px-2 py-[2px] text-[10px] font-normal text-black'
          >
            {tag}
          </div>
        ))}
    </div>
  )
}
