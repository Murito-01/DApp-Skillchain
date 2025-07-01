import { Link } from "react-router-dom";
import "./Home.css";

export default function Home() {
  return (
    <div className="home-container">
      <div className="home-box">
        <h1 className="home-title">Selamat Datang di SkillChain</h1>
        <p className="home-description">
          Platform terdesentralisasi untuk pendaftaran dan verifikasi sertifikasi profesi berbasis blockchain.
        </p>

        <div className="home-buttons">
          <Link to="/daftar" className="home-button primary">
            Daftar Peserta
          </Link>
          <Link to="/verifikasi" className="home-button secondary">
            Verifikasi Sertifikat
          </Link>
        </div>
      </div>
    </div>
  );
}