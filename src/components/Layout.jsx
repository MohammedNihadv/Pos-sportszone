import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ToastContainer from './ToastContainer';
import { useApp } from '../context/AppContext';

export default function Layout() {
  const { darkMode } = useApp();
  return (
    <div className={`flex h-screen overflow-hidden font-sans ${darkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-800'}`}>
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className={`flex-1 overflow-auto ${darkMode ? 'bg-slate-950' : 'bg-slate-50'}`}>
          <Outlet />
        </main>
      </div>
      <ToastContainer />
    </div>
  );
}
