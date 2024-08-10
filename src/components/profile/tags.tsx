export default function Tags({ tags }) {
  return (
    <div className='flex flex-wrap gap-2'>
      {tags &&
        tags.map((tag, index) => (
          <div
            key={index}
            className='flex items-center rounded-full bg-[#E1E1E1] px-2 py-1 text-[10px] font-normal text-black'
          >
            {tag}
          </div>
        ))}
    </div>
  )
}
