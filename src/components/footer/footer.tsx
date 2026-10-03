import Logo from '../../assets/image/logo-front.webp';
import './footer.css';

export const Footer = () => {
    return (
        <footer id="footer-container">
            <div id="footer-content">
                <div id="footer-logo">
                    <img
                        src={Logo}
                        alt="Life Topografia"
                    />
                </div>

                <address id="footer-address">
                    <p>
                        Rua das Rosas, 688 – Parque Sinai
                    </p>

                    <p>
                        Santana de Parnaíba/SP, 06532-320.
                    </p>
                </address>

                <address id="footer-contact">
                    <p>
                        <strong>Telefone:</strong>{' '}
                        (11) 96520-5244
                    </p>

                    <p>
                        <strong>Email:</strong>{' '}
                        contato@lifetopografia.com.br
                    </p>
                </address>
            </div>
        </footer>
    );
};

export default Footer;