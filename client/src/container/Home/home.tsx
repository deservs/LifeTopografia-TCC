import { useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, EffectFade } from 'swiper/modules';

import Sidebar from '../../components/Sidebar/sidebar.tsx';
import type { UserProfile } from '../../components/Sidebar/sidebar';

import Fundo1 from '../../assets/image/background/firstcard.webp';
import Fundo2 from '../../assets/image/background/secondcard.webp';
import Fundo3 from '../../assets/image/background/thirdcard.webp';
import Logo from '../../assets/image/logo-front.webp';

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import './home.css';

export default function Home() {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

const [currentUser,] = useState<UserProfile | null>(null);

    return (
        <div id="initial-card">
            {/* Sidebar com a prop 'user' injetada */}
            <Sidebar 
                isOpen={isSidebarOpen} 
                onClose={() => setIsSidebarOpen(false)} 
                user={currentUser}
            />

            {/* Conteúdo sobreposto ao carrossel */}
            <div id="superposition">
                <div id="main-content">
                    <div id="barra-lateral">
                        <button
                            type="button"
                            className="btn-menu"
                            onClick={() => setIsSidebarOpen(true)}
                            aria-label="Abrir Menu"
                        >
                            <span></span>
                            <span></span>
                            <span></span>
                        </button>
                    </div>

                    <div id="logo">
                        <img src={Logo} alt="Lifetopografia Logo" />
                    </div>

                    <div id="text">
                        <h1>Topografia de <span className="highlight">alto nível</span></h1>
                    </div>

                    <div className="divider-container">
                        <div className="line"></div>
                        <div className="rhombus"></div>
                        <div className="line"></div>
                    </div>

                    <h2>
                        Precisão, confiança e agilidade para transformar projetos em realidade. 
                        Trabalhamos com excelência em levantamentos topográficos, 
                        georreferenciamento, acompanhamento de obras e muito mais.
                    </h2>

                    <div className="divider-container">
                        <div className="line"></div>
                        <div className="rhombus"></div>
                        <div className="line"></div>
                    </div>

                    <div id="btn-solicite">
                        <button type="button">
                            SOLICITE UM ORÇAMENTO
                        </button>
                    </div>
                </div>
            </div>

            {/* Carrossel de Fundo */}
            <Swiper
                id="init-carrossel"
                modules={[Navigation, Pagination, Autoplay, EffectFade]}
                loop={true}
                speed={400}
                effect="fade"
                autoplay={true}
            >
                <SwiperSlide><img id="bg1" src={Fundo1} alt="" /></SwiperSlide>
                <SwiperSlide><img id="bg2" src={Fundo2} alt="" /></SwiperSlide>
                <SwiperSlide><img id="bg3" src={Fundo3} alt="" /></SwiperSlide>
            </Swiper>
        </div>
    );
}