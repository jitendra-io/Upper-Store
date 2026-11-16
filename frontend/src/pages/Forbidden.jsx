import { Link } from 'react-router-dom';
import CrystalCore3D from '../components/CrystalCore3D';
import './ErrorPage.css';

const Forbidden = () => {
  return (
    <main className="error-page-container">
      <div className="error-orb-wrapper">
        <CrystalCore3D minimal={true} />
      </div>
      <h1 className="error-heading">403 FORBIDDEN</h1>
      <Link to="/" className="error-back-btn">
        Return to Home
      </Link>
    </main>
  );
};

export default Forbidden;
