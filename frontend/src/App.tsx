import { Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Background } from '@/components/landing/Background';
import { PageLoader } from '@/components/ui/Loader';
import { ProfileProvider } from '@/context/ProfileContext';

/* Pages are code-split so each route shows the loader while it streams in. */
const Landing = lazy(() => import('@/pages/Landing').then((m) => ({ default: m.Landing })));
const SignIn = lazy(() => import('@/pages/SignIn').then((m) => ({ default: m.SignIn })));
const Register = lazy(() => import('@/pages/Register').then((m) => ({ default: m.Register })));
const Onboarding = lazy(() => import('@/pages/Onboarding').then((m) => ({ default: m.Onboarding })));
const About = lazy(() => import('@/pages/About').then((m) => ({ default: m.About })));
const Mother = lazy(() => import('@/pages/Mother').then((m) => ({ default: m.Mother })));
const Doctor = lazy(() => import('@/pages/Doctor').then((m) => ({ default: m.Doctor })));
const Appoint = lazy(() => import('@/pages/Appoint').then((m) => ({ default: m.Appoint })));
const HealthPlan = lazy(() => import('@/pages/HealthPlan').then((m) => ({ default: m.HealthPlan })));
const Contact = lazy(() => import('@/pages/Contact').then((m) => ({ default: m.Contact })));
const Consultants = lazy(() => import('@/pages/Consultants').then((m) => ({ default: m.Consultants })));

const LOADER_COPY: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Welcome to MaternalCare+', subtitle: 'Setting up a calmer way to care' },
  '/signin': { title: 'Signing you in...', subtitle: 'Securely opening your care space' },
  '/register': { title: 'Preparing your registration', subtitle: 'Just a moment while we get things ready' },
  '/onboarding': { title: 'Personalising your journey', subtitle: 'Tailoring questions to your stage' },
  '/about': { title: 'Opening our story', subtitle: 'Loading the journey of care' },
  '/health-plan': { title: 'Opening health plans', subtitle: 'Loading how organisations cover their members' },
  '/contact': { title: 'Opening contact', subtitle: 'Finding the right desk for your question' },
  '/consultants': { title: 'Opening consultants', subtitle: 'Loading how clinicians practise here' },
  '/mother': { title: 'Loading your dashboard', subtitle: 'Gathering your latest health insights' },
  '/doctor': { title: 'Opening the clinician portal', subtitle: 'Loading your caseload and today’s clinic' },
  '/appoint': { title: 'Opening the booking desk', subtitle: 'Finding the clinicians who can see you' },
};

export default function App() {
  const location = useLocation();
  const copy = LOADER_COPY[location.pathname] ?? {
    title: 'Preparing your care space...',
    subtitle: 'Just a moment while we gather everything for you',
  };

  return (
    <ProfileProvider>
      <div className="relative min-h-screen overflow-x-clip">
      <Background />
      <Suspense fallback={<PageLoader title={copy.title} subtitle={copy.subtitle} />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/register" element={<Register />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/about" element={<About />} />
          <Route path="/health-plan" element={<HealthPlan />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/consultants" element={<Consultants />} />
          <Route path="/mother" element={<Mother />} />
          <Route path="/doctor" element={<Doctor />} />
          <Route path="/appoint" element={<Appoint />} />
        </Routes>
      </Suspense>
      </div>
    </ProfileProvider>
  );
}
