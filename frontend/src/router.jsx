import { createBrowserRouter } from 'react-router-dom';
import App from './app.jsx';
import LoginPage from './pages/login.jsx';
import HomePage from './pages/home.jsx';
import { ProtectedRoute } from './routes/protected-route.jsx';

// Honor Vite's `base` so the router works under Docker root and GitHub Pages
// sub-path deployments without extra config.
const basename = (import.meta.env.BASE_URL || '/').replace(/\/$/, '') || '/';

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <App />,
      children: [
        { path: 'login', element: <LoginPage /> },
        {
          index: true,
          element: (
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          ),
        },
      ],
    },
  ],
  { basename },
);
