import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';

import Sidebar from '../../components/Sidebar/sidebar.tsx'; // Verifique o caminho da sua pasta de componentes

import Fundo1 from '../../assets/image/background/firstcard.png'
import Fundo2 from '../../assets/image/background/secondcard.png'
import Fundo3 from '../../assets/image/background/thirdcard.png'
import Logo from '../../assets/image/logo-front.png'

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './home.css'

export default function Home() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <>
            <div id="initial-card">

                {/* Componente Modular da Barra Lateral */}
                <Sidebar isOpen={isSidebarOpen} onClose={toggleSidebar}>
                    {/* Qualquer componente ou conteúdo colocado aqui dentro será renderizado no menu */}
                    <p>Conteúdo da Barra Lateral</p>
                </Sidebar>

                <div id="superposition">
                    <div id="barra-lateral">
                        <button type="button" onClick={toggleSidebar}>
                            <img src={Logo} alt="Abrir Barra Lateral" />
                        </button>
                    </div>
                    <div id="logo">
                        <img src={Logo} alt="Lifetopografia Logo" />
                    </div>
                    <div id="text">
                        <h1>Topografia de <span className="highlight">alto nível</span></h1>
                    <br />
                    <h2>Precisão, confiança e
                        agilidade para
                        transformar projetos em
                        realidade. Trabalhamos
                        com excelência em
                        levantamentos
                        topográficos,
                        georreferenciamento,
                        acompanhamento de
                        obras e muito mais.</h2>
                    </div>
                    <div id="line">
                        <div id="line2"></div>
                        <div id="midLine"></div>
                        <div id="line2"></div>
                    </div>
                    <div id="btn-solicite">
                        <button type="button"><img src={Logo} alt="Solicite um Orçamento" /></button>
                    </div>
                </div>

                <Swiper id="init-carrossel"
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