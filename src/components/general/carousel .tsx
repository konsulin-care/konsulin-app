import Image from 'next/image';
import 'swiper/css';
import { Swiper, SwiperSlide } from 'swiper/react';

interface Slide {
  icon: string;
  alt: string;
  title: string;
  description: string;
}

const Carousel = ({ slides }: { slides: Slide[] }) => {
  return (
    <div className='w-full'>
      <Swiper
        spaceBetween={0}
        slidesPerView={2}
        onSlideChange={undefined}
        onSwiper={undefined}
      >
        {slides.map((item: Slide) => {
          return (
            <SwiperSlide key={item.alt} className='p-4'>
              <div className='flex items-center'>
                <Image
                  src={`${item.icon}`}
                  alt={item.alt}
                  width={48}
                  height={48}
                />
                <div className='flex flex-grow flex-col items-start justify-start pl-2 text-start'>
                  <p className='text-secondary text-xs font-bold'>
                    {item.title}
                  </p>
                  <p className='text-black-100 text-[10px]'>
                    {item.description}
                  </p>
                </div>
              </div>
            </SwiperSlide>
          );
        })}
      </Swiper>
    </div>
  );
};

export default Carousel;
