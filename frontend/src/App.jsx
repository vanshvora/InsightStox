import { useState ,useEffect } from 'react'
import './App.css'
import { Auth } from './pages/auth'
import 'primeicons/primeicons.css';
import AOS from "aos";
import "aos/dist/aos.css";
import { Home } from './pages/Home'
import { Dashboard } from './pages/Dashboard';
import { Portfolio } from './pages/Portfolio';
import { MyProfile} from './pages/MyProfile';
import { StockDetails } from './pages/StockDetails';
import {HelpSupport} from './pages/HelpSupport';
import AiInsight from './pages/AiInsight';
import Watchlist from './pages/WatchList';
import {createBrowserRouter,RouterProvider} from "react-router-dom";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';
import { DataPrivacy } from './pages/DataPrivacy'; 
import { ActivitySessionHistory } from './pages/ActivitySessionHistory';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes cache
      gcTime: 24 * 60 * 60 * 1000, // 24 hours garbage collection
      refetchOnWindowFocus: false,
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
  throttleTime: 0,
});

const router = createBrowserRouter(
  [
    {
      path:"/",
      element:<Home/>
    },
     {
      path:"/auth",
      element:<Auth/>      
    },
    {
      path:"/dashboard",
      element:<Dashboard/>
    },
    {
      path:"/portfolio",
      element:<Portfolio/>
    },
    {
      path:"/my-profile",
      element:<MyProfile/>
    }
    ,{
      path:"/ai-insight",
      element:<AiInsight/>
    },
    {
      path: "/stockdetails/:symbol",
      element: <StockDetails />
    },
    {
      path:"/help-support",
      element:<HelpSupport/>
    }
    ,{
      path:"/watchlist",
      element:<Watchlist/>
    },
    {
      path:"/data-privacy",
      element:<DataPrivacy/>
    },
    {
      path:"/activity",
      element:<ActivitySessionHistory/>
    }
  ]
);
function App() {
  useEffect(() => {
    AOS.init({
      duration: 1200,
      once: false,
    });
  }, []);
  return (
    <PersistQueryClientProvider 
      client={queryClient}
      persistOptions={{ persister, buster: 'v2-bootstrap' }}
    >
         <RouterProvider router={router} />
    </PersistQueryClientProvider>
  )
}

export default App
