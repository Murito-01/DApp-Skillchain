import { Link } from "react-router-dom";

function Home() {
  return (
    <div className="container">
      <h1>Selamat Datang di SkillChain</h1>

      {/* Tambahkan navigasi ke halaman daftar peserta */}
      <nav>
        <ul>
          <li>
            <Link to="/daftar">Daftar Sebagai Peserta</Link>
          </li>
          {/* Jika nanti kamu punya halaman lain, tambahkan di sini */}
        </ul>
      </nav>
    </div>
  );
}

export default Home;