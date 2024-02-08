import 'font-awesome/css/font-awesome.min.css';
import './assets/css/app.css';
import Dashboard from './pages/Dashboard';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';

function App() {
    return (
        <Router>
            <Routes>
                <Route exact path='/' element={<Dashboard />} />
            </Routes>
        </Router>
    )
}

export default App;
