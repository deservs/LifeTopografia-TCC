import React from 'react';
import Logo from '../../assets/image/logo-front.png';
import './footer.css';

export const Footer: React.FC = () => {
    return (
        <footer id="footer-container">
            <div id="footer-content">
                <div id="footer-logo">
                    <img src={Logo} alt="Life Topografia Logo" />
                </div>

                <div id="footer-address">
                    <p>Rua das Rosas, 688 – Parque Sinai</p>
                    <p>Santana de Parnaíba/SP, 06532-320.</p>
                </div>

                <div id="footer-contact">
                    <p><strong>Telefone:</strong> (11) 96520-5244</p>
                    <p><strong>Email:</strong> contato@lifetopografia.com.br</p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;