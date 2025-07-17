import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { UploadPage } from './pages/UploadPage';
import { FoodConfirmationPage } from './pages/FoodConfirmationPage';
import { WeightConfirmationPage } from './pages/WeightConfirmationPage';
import { ResultsPage } from './pages/ResultsPage';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/confirm-food" element={<FoodConfirmationPage />} />
        <Route path="/confirm-weight" element={<WeightConfirmationPage />} />
        <Route path="/results" element={<ResultsPage />} />
      </Routes>
    </Router>
  );
}

export default App;
