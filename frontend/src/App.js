import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import NavigationBar from './shared/NavigationBar';
import NexusLayout from './components/layout/NexusLayout';
import './i18n';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <NavigationBar />
          {/* Spacer for fixed navbar */}
          <div style={{ height: '44px' }} />
          <NexusLayout />
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
