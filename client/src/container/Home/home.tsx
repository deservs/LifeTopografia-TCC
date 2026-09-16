import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';

import Fundo1 from '../../assets/image/background/firstcard.png'
import Fundo2 from '../../assets/image/background/secondcard.png'
import Fundo3 from '../../assets/image/background/thirdcard.png'

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './home.css'

export default function Home() {

    return (
        <>
            <div id="inital-card">
                <Swiper
                    modules={[Navigation, Pagination, Autoplay, EffectFade]}
                    loop={true}
                    speed={400}
                    loopAddBlankSlides={false}
                    loopPreventsSliding={false}
                    effect="fade"
                    autoplay={true}>

                    <SwiperSlide><img id="bg1" src={Fundo1} alt="" /></SwiperSlide>
                    <SwiperSlide><img id="bg2" src={Fundo2} alt="" /></SwiperSlide>
                    <SwiperSlide><img id="bg3" src={Fundo3} alt="" /></SwiperSlide>
                </Swiper>
            </div>
        </>
    )
}