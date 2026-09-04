import { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createTimeline, stagger } from 'animejs';
import { Activity, ArrowRight, Baby, BellRing, Calendar, ChevronDown, HeartPulse, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { Navbar } from '@/components/landing/Navbar';
import { Footer } from '@/components/landing/Footer';
import { LiquidButton } from '@/components/ui/LiquidButton';
import { Reveal } from '@/components/ui/Reveal';

/* refined, trustworthy palette */
const INK = '#2f3a5c'; // muted deep indigo line
const SAGE = '#8fb9a8';
const ROSE = '#e3b3ad';
const PEACH = '#f1cb99';

/** The provided one-line mother illustration (filled line-art path). */
const MOTHER_D =
  'M 627.97,587 c 0.47,2.24 -0.16,4.07 -1.88,5.48 c -2.57,0.8 -3.08,0.73 -3.1,3.57 c -2.96,3.99 -7.41,3.98 -11.62,2.05 c -3.68,-1.17 -2.89,3.7 -6.89,3.08 c -10.28,-3.6 -20.55,-7.21 -30.81,-10.83 c -0.38,0.28 -0.52,0.66 -0.44,1.15 c -0.01,5.39 -0.33,44.16 -2.03,46.2 c -1.04,0.22 -1.92,-0.06 -2.63,-0.84 c 0.36,-9.35 0.72,-18.71 1.07,-28.08 c -0.11,-0.09 -0.23,-0.19 -0.35,-0.28 c -107.58,23.29 -192.37,-67.4 -290.25,-92.14 c -24.36,-5.96 -51.66,-7.98 -74.28,4.84 c -0.31,0.33 -0.37,0.71 -0.16,1.12 c 8.08,14.36 17.56,54.17 -8.1,55.63 c -15.08,-1.33 -21.19,-15.94 -17.31,-29.41 c 3.48,-11.55 10.19,-20.76 20.13,-27.63 c 0.83,-1.08 -2.35,-4.95 -2.9,-5.96 c -29,-42.86 -81.08,-54.23 -129.92,-51.85 c -23.02,1.24 -45.37,4.47 -66.5,-7.13 c 0,-1.33 0,-2.67 0,-4.01 c 11.23,8.32 30.03,9.42 43.5,9.01 c 56.66,-4.25 114.75,-0.87 152.4,47.57 c 2.29,3.28 4.52,6.58 6.69,9.91 c 13.4,-7.17 27.71,-10.52 42.91,-10.08 c 62.63,2.25 123.82,44 179.11,70.56 c 40.45,20.21 100.15,39.01 144.64,25.86 c 0.4,-0.35 0.6,-0.79 0.59,-1.32 c -0.2,-2.76 0.79,-13.66 -0.43,-15.43 c -22.97,-16.53 -63.18,-51.3 -43.65,-82.98 c 25.06,-41.87 62.9,-83.19 70.92,-132.7 c 2.06,-16.92 2.94,-33.88 4.41,-50.86 c 4.25,-21.31 -7.98,-45.25 -15.46,-64.8 c -17.49,-43.46 -14.24,-90.68 -2.51,-135.14 c 6.83,-25.24 23.66,-56.94 51.81,-62.35 c 32.94,-29.82 66.99,-4.01 88.27,24.89 c 22.77,30.25 27.76,69.09 50.47,98.58 c 17.78,21.63 46.76,28.4 71.25,39.06 c 9.42,4.56 17.32,10.98 23.71,19.27 c 24.25,33.5 28.63,89.37 33.21,129.49 c 3.39,44.01 7.95,89.05 -8.55,131.18 c -4.77,9.95 -8.25,24.26 -22.58,20.87 c -22.44,-5.38 -44.33,-12.45 -65.69,-21.2 c -1.16,-0.45 -1.78,-0.06 -1.86,1.17 c -1.37,22.95 1.61,44.19 5.19,66.71 c 0.23,0.43 0.59,0.72 1.05,0.88 c 10.99,4.72 22.18,8.87 33.59,12.44 c 38.71,11.65 79.79,-12.23 90.35,-50.77 c 2.13,-1.33 3.11,0.72 2.61,2.7 c -5.68,18.35 -16.68,32.62 -32.98,42.81 c -32.02,19.76 -59.95,10.84 -91.69,-2.87 c -0.81,-0.46 -1.56,-0.42 -2.25,0.12 c 0.25,9.31 0.2,18.63 -0.15,27.96 c -0.47,10.31 -1.93,20.48 -4.38,30.5 c -1.82,3.51 -5.33,26.04 -8.62,25.51 c -3.6,-2.7 -0.49,-4.92 0.39,-7.84 c 7.64,-24.47 11.4,-49.32 9.3,-74.97 c -2.87,-25.51 -7.96,-49.26 -5.62,-75.19 c 0.03,-0.57 -0.16,-1.05 -0.56,-1.45 c -37.98,-16.29 -72.92,-36.04 -105.8,-61.19 c -8.96,-7.85 -22.74,-0.99 -33.13,-0.12 c -12.81,2.31 -55.67,1.93 -63.87,-8.69 c -0.34,-0.94 -0.68,-1.87 -1.04,-2.78 c -13.38,15.3 -24,32.31 -31.86,51.04 c -1.92,4.31 -8.77,26.93 -6.57,29.92 c 10.34,7.61 20.18,15.81 29.54,24.6 c 5.36,4.55 5.56,9.95 -0.93,13.49 c -1.85,0.74 -3.65,1.49 -5.43,2.26 c 10.68,7.52 21.44,14.94 32.29,22.26 c 6.5,4.78 13.18,8.81 15.38,17.15 Z M 630.09,64.76 c 0.7,-0.14 0.75,-0.36 0.16,-0.67 c -24.32,6.08 -39.04,39.63 -44.89,61.6 c -9.53,37.51 -12.86,80.74 -0.68,118 c 6.04,18.81 15.93,37.32 19.3,56.81 c 0.68,4.45 1.18,8.9 1.48,13.33 c 16.39,-30.79 9.02,-71.61 10.66,-105.33 c 0.2,-2.28 0.6,-4.51 1.2,-6.7 c 0.99,-0.74 1.95,-0.67 2.9,0.19 c -2.12,11.17 -1.12,23.21 -0.58,34.51 c 0.16,1.44 0.48,2.85 0.95,4.22 c 2.17,6.14 4.4,12.25 6.7,18.34 c 3.26,10.12 4.61,20.48 4.06,31.08 c 0,0.12 0,0.23 0.01,0.35 c 0.38,-0.01 0.58,-0.22 0.6,-0.63 c 0.54,0.03 0.78,-0.22 0.73,-0.75 c 8.38,-15.42 7.05,-27.96 1.88,-44.13 c -0.73,-4.18 -0.62,-8.34 0.35,-12.49 c 1.18,-4.93 2.12,-9.9 2.79,-14.92 c -0.21,-0.67 -0.67,-1.03 -1.4,-1.07 c -11.22,-0.14 -14.32,-2.67 -15.2,-14.4 c -0.09,-5.15 -1.79,-9.69 -5.1,-13.61 c -18.74,-15.59 -32.67,-42.6 -17.27,-65.44 c 0.95,-1.97 4.03,-2.45 3.63,0.26 c -13.6,20.14 -5.4,39.31 8.56,56.26 c 11.95,9.06 12.57,13.18 14.38,27.76 c 1.51,9.71 12.28,3.37 17.64,8.32 c 2.48,3.55 2.6,4.01 7.04,4.2 c 0.58,0.99 1.14,2 1.67,3.03 c 7.3,1.78 8.12,1.79 13.45,7.31 c 8.62,7.45 18.07,2.17 24.34,-5.25 c 9.75,-11.88 24.87,-49.57 17.61,-63.49 c 0.1,-1.51 0.88,-1.97 2.34,-1.4 c 3.77,3.6 3.39,9.53 2.98,14.28 c 8.28,20.22 -2.48,42.36 3.41,63.22 c 5.33,18.83 25.36,30.91 43.82,21.56 c 1.88,-1.03 3.59,-2.27 5.13,-3.73 c -0.1,-0.13 -0.19,-0.27 -0.28,-0.4 c -20.83,-0.73 -28.33,-20.36 -27.85,-38.55 c 1.26,-25.22 6.09,-43.54 -5.18,-68.15 c -1.42,-3.28 1.75,-4.11 3.01,-1.26 c 4.37,9.71 6.9,19.87 7.58,30.48 c 0.62,5.42 -0.89,15.34 0.04,19.97 c 11.19,18.1 26.73,23.35 47.4,20.22 c 7.61,-1.29 15.21,-2.65 22.8,-4.09 c 0.98,-0.39 0.26,-1.44 -0.33,-1.79 c -0.22,-0.32 -0.53,-0.46 -0.92,-0.43 c -27.03,-10.23 -42.07,-24.17 -54.49,-50.38 c -17.26,-39.98 -32.63,-91.38 -76.97,-109.15 c -33.98,-12.93 -54.89,22.71 -68.49,47.69 c -0.91,1.77 -3.29,1.56 -3.48,-0.43 c 6.46,-12.13 13.96,-23.58 22.51,-34.35 Z M 606.3,119.71 c 0.15,-0.69 0.43,-1.3 0.86,-1.84 c 4.11,-0.83 8.22,-0.75 12.32,0.23 c 22.21,6.32 43.62,21.71 67.95,12.91 c 0.96,-0.57 3.13,-1.36 3.33,-2.61 c 0,-9.41 4.37,-20.47 15.75,-18.5 c 18.48,4.61 21.41,43.71 4.81,48.77 c -1.99,0.08 -6.01,0.3 -4.17,-2.81 c 15.3,-1.93 12.89,-24.24 8.02,-34.5 c -5.17,-10.76 -17.61,-12.1 -20.39,1.09 c -0.43,2.93 -0.79,5.85 -1.07,8.76 c -20.16,14.27 -51.2,-1.18 -71.34,-9.07 c -3.53,-2.22 -14.58,-0.65 -16.07,-2.43 Z M 770.24,257.95 c 0.24,-0.29 0.39,-0.62 0.46,-0.98 c 6.41,-10.17 9.45,-21.89 13.86,-32.96 c 0.31,-0.74 0.4,-1.5 0.26,-2.28 c -4.05,0.3 -8.13,0.25 -12.26,-0.15 c -13.01,-1.66 -23.24,-7.9 -30.68,-18.72 c -0.29,-0.53 -0.65,-0.56 -1.1,-0.09 c -0.49,0.29 -0.66,0.72 -0.52,1.28 c -0.16,4.48 -0.32,8.96 -0.48,13.45 c -1.18,16.11 9.68,37.91 28.74,33.62 c 2.32,0.26 2.81,1.38 1.48,3.37 c -6.01,7.52 -13.84,11.22 -23.5,11.08 c -19.69,-0.47 -32.75,-15.31 -35.42,-34.07 c -1.53,-15.95 1.5,-32.49 0.79,-48.85 c -0.58,-0.55 -1.14,-0.54 -1.7,0.03 c -0.61,10.67 -6.47,25.14 -11.35,34.68 c -2.03,3.43 -4.17,6.77 -6.42,10.02 c 1.29,1.95 2.48,3.97 3.59,6.06 c 2.21,4.74 2.75,9.66 1.64,14.75 c -3.93,2.57 -2.38,-4.99 -2.76,-6.69 c 0.18,-2.07 -3.33,-12.07 -5.9,-11.08 c -5.11,4.29 -11.56,7.62 -18.44,6.38 c -2.34,-0.61 -4.61,-1.41 -6.79,-2.4 c -1.61,3.55 -2.91,7.23 -3.89,11.05 c -2.03,6.82 -2.01,13.97 1.83,20.06 c -13.37,-0.56 -17.95,-12.81 -19.69,-23.93 c -0.87,-0.95 -5.22,-0.78 -4.47,1.73 c 4.61,15.03 6.85,27.21 0.62,42.33 c -0.93,10.5 41.7,12.54 45.36,9.32 c 5.51,-8.25 12.6,-14.49 20.07,-20.91 c 2.35,-2.65 5.45,-1.33 3.41,1.46 c -6.05,4.92 -11.68,10.29 -16.89,16.1 c -0.51,0.71 -3.38,3.6 -0.65,3.45 c 31.26,-3.49 61.62,-9.86 80.8,-37.11 Z M 635.32,291 c 0.48,-0.02 0.97,-0.03 1.45,-0.02 c 13.33,13.13 53.74,7.94 70.7,4.8 c 29.09,-5.23 57.98,-16.25 70.47,-45.31 c 2.32,-3.84 9.74,-28.01 11.78,-29.25 c 6.27,-1.3 25.36,-6.32 30.58,-4.98 c 0.37,0.29 0.44,0.65 0.19,1.06 c -14.32,16.23 -27.29,42.29 -28.14,64.2 c 0.49,18.88 8.42,33.82 23.78,44.82 c 0.39,0.33 0.66,0.75 0.81,1.25 c 3.97,20.35 7.91,40.72 11.81,61.09 c 0.17,1.14 0.04,2.23 -0.41,3.29 c -5.31,13.13 -10.44,26.32 -15.38,39.58 c -0.16,0.82 -0.65,1.24 -1.47,1.25 c -34.86,-10.66 -65.73,-30.58 -99.83,-43.01 c -26.1,-6.54 -56,-26.44 -83.18,-16.82 c -3.22,0.39 -7.32,-6.65 -8.97,-8.97 c -10.63,-18.21 -6.08,-39.19 1.22,-57.68 c 2.03,-4.62 4.15,-9.19 6.38,-13.7 c 0.51,-0.5 0.99,-0.51 1.45,-0.01 c -0.63,1.37 -1.53,5.22 0.9,5.24 c 2.24,-0.72 4.8,-4.79 5.86,-6.83 Z M 901.7,418.86 c -0.55,0.78 -0.81,1.65 -0.77,2.62 c 0.5,5.36 0.5,10.72 0,16.08 c -0.16,0.74 0.08,1.24 0.75,1.49 c -1.17,26.56 -5.03,53.15 -18.96,76.28 c -3.39,5.18 -8.72,4.96 -14.07,3.45 c -64.39,-16.17 -122.65,-45.38 -175.71,-85.03 c -8.92,-6.42 -26.15,0.46 -36.43,1.04 c -15.96,2.01 -38.89,0.54 -53.92,-4.82 c -2.46,-0.89 -3.54,-2.59 -3.24,-5.11 c 0.34,0.03 0.51,-0.13 0.52,-0.46 c 8.48,-1.28 17,-1.82 25.57,-1.63 c 2.02,-0.46 1.08,-2.7 -0.49,-3.07 c -7.34,-1.2 -17.68,0.5 -25.08,1.63 c -0.46,-0.2 -0.73,-0.07 -0.84,0.39 c -0.7,-0.09 -1.42,-0.13 -2.13,-0.13 c -0.05,-0.35 -0.26,-0.47 -0.62,-0.36 c -0.76,-5.42 14.75,-9.1 18.68,-9.85 c 3.29,-0.32 6.54,-0.72 9.76,-1.22 c 0.64,-2.05 -0.1,-3.01 -2.22,-2.89 c -5.92,0.15 -11.66,1.24 -17.23,3.25 c -0.38,0.19 -0.71,0.14 -0.98,-0.14 c 0.17,-0.87 0.49,-1.68 0.97,-2.43 c 0.26,-0.2 0.44,-0.46 0.55,-0.77 c 2.02,-2.39 4.42,-4.34 7.18,-5.83 c 4.45,-2.04 9,-3.77 13.65,-5.19 c 0.32,-0.78 0.34,-1.57 0.08,-2.37 c -1.27,-1.34 -9.63,2.45 -11.45,2.83 c -0.4,0.19 -0.72,0.12 -0.97,-0.21 c 0.14,-0.67 0.43,-1.27 0.89,-1.8 c 11.14,-13.72 27.45,-12.18 43.32,-10.46 c 1.78,0.1 3.94,-0.23 2.39,-2.44 c -3.75,-2.05 -23.74,-2.67 -28.56,-0.99 c -3.32,0.81 -6.55,1.83 -9.71,3.05 c -3.87,-1.5 -5.06,-5.4 0.04,-6.46 c 16.78,-3.72 28.07,-5.41 45.05,0.26 c 16.88,7.47 34.44,12.18 51.71,18.48 c 38.98,16.58 74.35,39.37 117.1,45.82 c 8.39,1.87 17.07,6.46 24.56,10.63 c 1.2,1.01 5.6,5.73 5.15,0.55 c -3.37,-5.57 -23.82,-12.19 -24.55,-14.07 c -8.58,-45.15 -17.21,-90.3 -25.92,-135.44 c -1.09,-4.26 -2.37,-10.69 -6.49,-13.09 c -1.99,-0.12 -2.57,0.74 -1.74,2.59 c 5.85,5.9 6.21,19.68 8.18,27.52 c 0.12,0.44 0.03,0.81 -0.26,1.13 c -2.75,-2.11 -5.26,-4.49 -7.52,-7.13 c -14.23,-16.56 -15.23,-37.53 -7.19,-57.25 c 2.84,-7.03 18.21,-40.78 26.56,-38.95 c 33.63,9.93 46.98,29.14 56.08,61.93 c 12.34,44.18 16.11,92.88 18.31,138.57 Z M 637.29,237.78 c 0.43,-2.03 0.77,-4.08 1.04,-6.14 c 0.95,-4.2 1.98,-8.36 3.07,-12.46 c 0.56,1.02 1.26,1.94 2.1,2.76 c 1.6,1.67 -1,11.85 -0.97,14.37 c -0.28,2.13 -3.77,1.64 -5.24,1.47 Z M 647.37,223.85 c 0.16,0.09 0.33,0.17 0.49,0.26 c 0.31,0.33 0.66,0.61 1.06,0.83 c 1.6,2.25 8.24,1.03 11.29,5.24 c 0.35,0.37 0.58,0.82 0.7,1.33 c -1.82,5.26 -3.47,10.59 -4.95,15.99 c -0.98,3.93 -1.08,7.88 -0.3,11.85 c -1.13,1.39 -5.34,-3.35 -6.03,-4.34 c -6.53,-8.93 -3.29,-21.04 -2.26,-31.16 Z M 620.07,249.96 c 0.25,-0.03 0.51,-0.07 0.76,-0.1 c 2.53,7.17 9.32,29.14 6.95,35.51 c -16.04,24.6 -27.91,64.09 -5.09,88.27 c -0.12,0.33 -0.36,0.51 -0.71,0.54 c -0.36,0.08 -0.67,0.23 -0.96,0.45 c -5.6,1.19 -6.78,6.66 -2.54,10.34 c 0.31,0.42 0.38,0.88 0.21,1.37 c -2.12,1.85 -4.08,3.86 -5.88,6.05 c -1.73,2.4 -3.15,4.98 -4.26,7.72 c -5.17,3.75 -7.01,7.06 -9.21,12.8 c -6.43,4.08 -6.46,4.05 -6.62,11.45 c -16.28,19.72 -29.71,40.25 -36.49,65.19 c -1.24,4.98 -2.3,9.99 -3.17,15.02 c -3.16,-0.26 -6.34,-0.18 -9.53,0.23 c -1.47,0.62 -6.83,0.84 -6.98,2.87 c -0.53,4.05 13.5,-2.49 17.49,1.68 c 11.57,7.62 22.72,17.76 32.63,27.47 c 3.05,5.75 -8.81,8.46 -12.61,6.4 c -7.8,-5.91 -14.95,-14.02 -24.55,-16.86 c -1.59,-0.27 -1.59,1.68 -0.94,2.62 c 6.58,3.3 12.21,7.26 17.76,12.11 c -0.22,0.86 -0.59,1.69 -1.1,2.48 c -0.09,0.51 0.06,0.94 0.47,1.27 c 2.73,0.97 5.5,1.82 8.32,2.55 c 14.05,10.04 28.25,19.87 42.6,29.49 c 3.34,2.8 6.72,5.74 7.89,10.11 c 0.52,2.81 -0.54,3.55 -3.17,2.21 c -11.34,-6.27 -22.65,-12.3 -34.33,-17.88 c -4.36,-2.08 -28.4,-22.67 -30.89,-20.7 c -3.24,2.97 10.92,8.82 12.47,11.21 c 14.94,13.65 33.19,19.69 50.36,29.81 c 3.22,3.41 -1.83,5.45 -4.95,3.83 c -17.86,-9.57 -35.83,-19.99 -52.55,-31.43 c -1.63,-0.93 -2.45,-0.46 -2.46,1.41 c 0.46,1.13 1.24,1.98 2.34,2.55 c -0.54,0.52 -1.04,1.07 -1.51,1.65 c -1.1,-1.35 -2.34,-1.53 -3.73,-0.53 c -1.11,-0.05 -1.37,1.7 -2.09,2.33 c -20.83,-18.53 -40.45,-40.75 -23.01,-68.9 c 18.64,-28.96 40.18,-56.62 55.4,-87.6 c 15.5,-29.9 15.43,-60.63 18.01,-93.29 c 15.07,-22.47 14.75,-43.48 15.33,-69.64 c 0.15,-0.68 0.26,-1.37 0.34,-2.06 Z M 829.3,397.99 c 0.44,0.06 0.88,0.04 1.32,-0.06 c 2.27,12.89 4.69,25.75 7.25,38.59 c 0.23,0.83 0.04,1.52 -0.56,2.07 c -6.91,-0.97 -13.74,-2.31 -20.5,-4.02 c -1.26,-0.43 -0.84,-1.97 -0.54,-2.89 c 4,-11.37 8.96,-22.37 13.03,-33.69 Z M 201,523.57 c 0.23,0.11 0.46,0.21 0.7,0.32 c 7.54,11.46 15.6,48.18 -4.27,50.87 c -16.98,-1.08 -18.37,-18.78 -12.83,-31.47 c 3.74,-8 9.21,-14.57 16.4,-19.72 Z M 624.42,601.3 c 0.03,0.72 0.25,1.38 0.66,1.97 c 30.33,12.29 73.3,5.73 102.85,-6.99 c 3.08,-0.69 7.92,-5.48 1.91,-5.79 c -0.67,0.57 -1.29,1.19 -1.86,1.88 c -31.64,13.42 -67.81,20 -101.06,8.36 c -0.94,-0.28 -1.77,-0.09 -2.5,0.57 Z';

const CAPTIONS = [
  { t: 'Every mother deserves the best care.', pos: 'left-6 top-24 md:left-16 md:top-28' },
  { t: 'Guidance, support and confidence — every step.', pos: 'left-6 bottom-28 md:left-16 md:bottom-32' },
  { t: 'Every child deserves the best start.', pos: 'inset-x-0 bottom-28 text-center md:bottom-32' },
];

const WIDGETS = [
  { icon: Calendar, title: 'Check-up', sub: 'in 3 days', tone: PEACH, pos: 'left-[40%] top-[28%]', dur: 6.5, size: 'md' as const },       // near her head-left
  { icon: Baby, title: 'Baby', sub: 'Week 26', tone: SAGE, pos: 'right-[34%] top-[18%]', dur: 7.5, size: 'sm' as const },                 // above head
  { icon: ShieldCheck, title: 'Today’s care', sub: 'Stable', tone: SAGE, pos: 'left-[37%] top-[44%]', dur: 7, size: 'lg' as const },      // lower-left, by her side
  { icon: HeartPulse, title: 'Health Check', sub: 'Healthy · 148 bpm', tone: ROSE, pos: 'right-[12%] top-[48%]', dur: 8, size: 'md' as const }, // her right side
];

const WSIZE = {
  sm: { pad: 'px-3 py-2', box: 'h-7 w-7', icon: 'h-3.5 w-3.5', title: 'text-[12px]', sub: 'text-[10px]' },
  md: { pad: 'px-3.5 py-2.5', box: 'h-8 w-8', icon: 'h-4 w-4', title: 'text-[13px]', sub: 'text-[11px]' },
  lg: { pad: 'px-4 py-3', box: 'h-9 w-9', icon: 'h-[18px] w-[18px]', title: 'text-sm', sub: 'text-[12px]' },
};

/** The three lines that close our story — a reading, an alert, a prediction. */
const BEHIND = [
  { icon: Activity, lead: 'measurement', tail: 'a mother', tone: ROSE },
  { icon: BellRing, lead: 'alert', tail: 'a family', tone: PEACH },
  { icon: Sparkles, lead: 'prediction', tail: 'an opportunity to protect a future', tone: SAGE },
];

const VALUES = [
  { icon: HeartPulse, title: 'Clinician-reviewed', sub: 'Guidance you can trust, at every stage.', tone: ROSE },
  { icon: ShieldCheck, title: 'Private by design', sub: 'Your data stays yours — always protected.', tone: SAGE },
  { icon: Baby, title: 'Every stage', sub: 'From pre-conception to the first steps.', tone: PEACH },
];

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));

export function About() {
  const navigate = useNavigate();
  const sectionRef = useRef<HTMLElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const section = sectionRef.current;
    if (!root || !section) return;
    const q = (sel: string) => root.querySelectorAll(sel);

    const tl = createTimeline({ autoplay: false, defaults: { ease: 'inOutSine', duration: 900 } });

    // Beat 1 — the mother draws herself over the FIRST full scroll (ends at ~50% of the timeline)
    tl.add(q('.js-clip'), { width: [0, 942], duration: 3000, ease: 'inOutQuad' }, 0);
    tl.add(q('.js-cap-0'), { opacity: [0, 1], translateY: [20, 0], duration: 600 }, 300);
    tl.add(q('.js-cap-0'), { opacity: [1, 0], duration: 400 }, 2600);

    // Beat 2 — floating app-feature widgets drift in over the SECOND full scroll
    tl.add(q('.js-widget'), { opacity: [0, 1], translateY: [26, 0], scale: [0.9, 1], duration: 600, delay: stagger(150) }, 3100);
    tl.add(q('.js-cap-1'), { opacity: [0, 1], translateY: [20, 0], duration: 600 }, 3300);
    tl.add(q('.js-cap-1'), { opacity: [1, 0], duration: 400 }, 4600);

    // Beat 3 — her belly glows, gently pulsing (tail of the second scroll)
    tl.add(q('.js-glow'), { opacity: [0, 0.95], duration: 700 }, 4500);
    tl.add(q('.js-glow'), { rx: [70, 118], ry: [62, 104], duration: 900 }, 4500);
    tl.add(q('.js-glow'), { rx: [118, 106], ry: [104, 94], duration: 700 }, 5400);
    tl.add(q('.js-pulse'), { opacity: [0, 1], duration: 600 }, 4700);
    tl.add(q('.js-cap-2'), { opacity: [0, 1], translateY: [22, 0], duration: 800 }, 4800);

    tl.pause();

    let ticking = false;
    const apply = () => {
      ticking = false;
      const scrollLen = section.offsetHeight - window.innerHeight;
      const p = clamp(-section.getBoundingClientRect().top / (scrollLen || 1));
      tl.seek(tl.duration * p);
      if (barRef.current) barRef.current.style.width = `${p * 100}%`;
    };
    const onScrollEvt = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(apply);
      }
    };
    window.addEventListener('scroll', onScrollEvt, { passive: true });
    window.addEventListener('resize', apply);
    apply();
    return () => {
      window.removeEventListener('scroll', onScrollEvt);
      window.removeEventListener('resize', apply);
      tl.pause();
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes aboutPulse { 0%{transform:scale(0.5);opacity:.55} 70%{opacity:0} 100%{transform:scale(1.9);opacity:0} }
        @keyframes aboutDrift { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)} }
      `}</style>

      <Navbar />
      <main>
        {/* cinematic hero — laughing-child video with the headline laid over it */}
        <section className="px-4 pt-24 sm:pt-28">
          <div className="mx-auto max-w-7xl">
            <Reveal>
              <div className="relative overflow-hidden rounded-[2rem] border border-white/50 shadow-glass sm:rounded-[2.75rem]">
                <video
                  className="absolute inset-0 h-full w-full object-cover"
                  src="/media/laughing-child.mp4"
                  poster="/hero/doctor-baby.jpg"
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                />
                {/* legibility scrim */}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-ink/25 to-ink/5" />
                {/* floating chip */}
                <div className="absolute right-5 top-5 flex items-center gap-2.5 rounded-2xl border border-white/30 bg-white/15 px-3.5 py-2.5 shadow-glass backdrop-blur-xl sm:right-8 sm:top-8">
                  <span className="grid h-8 w-8 flex-none place-items-center rounded-xl bg-white/25">
                    <Baby className="h-4 w-4 text-white" />
                  </span>
                  <div>
                    <div className="text-[13px] font-bold leading-none text-white">Full of giggles</div>
                    <div className="mt-1 text-[11px] font-medium text-white/80">Healthy &amp; happy</div>
                  </div>
                </div>
                {/* overlaid headline */}
                <div className="relative z-10 flex min-h-[76vh] flex-col justify-end p-7 sm:min-h-[84vh] sm:p-14">
                  <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white backdrop-blur-md">
                    <HeartPulse className="h-3.5 w-3.5" /> Our story
                  </span>
                  <h1 className="mt-5 max-w-3xl text-balance text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
                    Care, <span className="font-serif italic font-medium">reimagined</span> for every mother and child
                  </h1>
                  <p className="mt-5 max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">
                    From the first heartbeat to the first steps — calm, connected care that grows with your family.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* our story — editorial narrative (Maven-inspired) */}
        <section className="px-4 py-20 sm:py-28">
          <div className="mx-auto max-w-6xl">
            <Reveal>
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">Our story</span>
            </Reveal>
            <div className="mt-6 grid gap-10 md:grid-cols-[1.05fr_1fr] md:gap-16">
              <Reveal delay={0.05}>
                <h2 className="text-balance text-3xl font-extrabold leading-[1.12] tracking-tight text-ink sm:text-4xl lg:text-5xl">
                  Because care should begin{' '}
                  <span className="font-serif italic font-medium text-brand-600">before there is a crisis</span>.
                </h2>
              </Reveal>
              <Reveal delay={0.1}>
                <div className="space-y-4 text-lg leading-relaxed text-ink-soft">
                  <p>
                    Pregnancy is more than nine months of waiting for a baby. It is a journey filled with
                    questions, changes, uncertainty, and moments when a mother simply needs to know that
                    someone is paying attention.
                  </p>
                  <p className="text-ink-muted">
                    Yet for too many mothers, care can feel fragmented. Important health information is
                    scattered. Warning signs may go unnoticed. Support can be difficult to reach. And
                    sometimes, help comes only after something has already gone wrong.
                  </p>
                  <p className="font-semibold text-ink">We believe it should be different.</p>
                </div>
              </Reveal>
            </div>

            {/* the founding idea — set apart as a pull quote */}
            <Reveal delay={0.12}>
              <figure className="mt-14 overflow-hidden rounded-4xl border border-white/60 bg-white/55 px-7 py-10 shadow-soft backdrop-blur-md sm:px-12 sm:py-12">
                <figcaption className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-600">
                  MaternalCare+ was created around a simple idea
                </figcaption>
                <blockquote className="mt-4 text-balance font-serif text-3xl italic leading-snug text-ink sm:text-4xl">
                  A mother should never have to navigate this journey{' '}
                  <span className="text-gradient not-italic">alone</span>.
                </blockquote>
              </figure>
            </Reveal>

            <Reveal delay={0.14}>
              <div className="mx-auto mt-14 max-w-3xl space-y-4 text-lg leading-relaxed text-ink-soft">
                <p>
                  We bring maternal and child health monitoring, personalised guidance, healthcare
                  professionals and intelligent risk awareness together in one place — helping mothers stay
                  informed about their health while giving healthcare providers a clearer picture of the
                  people they care for.
                </p>
                <p className="text-ink-muted">But our goal goes beyond monitoring.</p>
              </div>
            </Reveal>

            {/* reactive → proactive */}
            <Reveal delay={0.16}>
              <div className="mt-10 grid items-stretch gap-4 sm:grid-cols-[1fr_auto_1fr]">
                <div className="rounded-3xl border border-white/60 bg-white/45 p-6 shadow-soft backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-faint">Care today</div>
                  <div className="mt-2 text-xl font-bold text-ink-muted">Reactive</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">
                    Waiting for problems to appear before anyone can respond.
                  </p>
                </div>
                <div className="flex items-center justify-center">
                  <span className="grid h-11 w-11 place-items-center rounded-full border border-white/60 bg-white/70 shadow-soft backdrop-blur-md">
                    <ArrowRight className="h-5 w-5 rotate-90 text-brand-600 sm:rotate-0" />
                  </span>
                </div>
                <div className="rounded-3xl border border-brand-200/70 bg-gradient-to-br from-brand-50/90 to-white/60 p-6 shadow-soft backdrop-blur-md">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">Where we are going</div>
                  <div className="mt-2 text-xl font-bold text-ink">Proactive</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    Recognising risks early, understanding what they mean, and creating opportunities to act
                    before they become something more serious.
                  </p>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.18}>
              <p className="mx-auto mt-14 max-w-2xl text-balance text-center text-xl leading-relaxed text-ink-soft sm:text-2xl">
                Because technology should not replace the human side of healthcare.{' '}
                <span className="font-semibold text-ink">It should strengthen it.</span>
              </p>
            </Reveal>

            {/* behind every measurement is a person */}
            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {BEHIND.map((b, i) => (
                <Reveal key={b.lead} delay={0.2 + 0.05 * i}>
                  <div className="h-full rounded-3xl border border-white/60 bg-white/55 p-6 shadow-soft backdrop-blur-md">
                    <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${b.tone}33` }}>
                      <b.icon className="h-5 w-5" style={{ color: INK }} />
                    </span>
                    <p className="mt-4 text-[15px] leading-relaxed text-ink-muted">
                      Behind every {b.lead}
                      <br />
                      is <span className="font-bold text-ink">{b.tail}</span>.
                    </p>
                  </div>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.32}>
              <p className="mx-auto mt-14 max-w-3xl text-balance text-center text-lg leading-relaxed text-ink-soft">
                We are building MaternalCare+ for every mother who deserves to feel seen, supported and cared
                for — and for every child who deserves the healthiest possible beginning.
              </p>
            </Reveal>

            {/* emotional closing line */}
            <Reveal delay={0.36}>
              <p className="mt-14 text-balance text-center font-serif text-3xl italic leading-snug text-ink sm:text-4xl">
                Every mother deserves the best care.
                <br />
                Every child deserves the best start.
                <br />
                <span className="text-gradient not-italic">We’re here for both.</span>
              </p>
            </Reveal>
            <Reveal delay={0.4}>
              <div className="mt-9 flex justify-center">
                <LiquidButton size="lg" onClick={() => navigate('/register')} iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>
                  Start your journey
                </LiquidButton>
              </div>
            </Reveal>
          </div>
        </section>

        {/* values strip */}
        <section className="px-4 pb-6">
          <div className="mx-auto grid max-w-6xl gap-4 sm:grid-cols-3">
            {VALUES.map((v, i) => (
              <Reveal key={v.title} delay={0.05 * i}>
                <div className="h-full rounded-3xl border border-white/60 bg-white/55 p-6 shadow-soft backdrop-blur-md">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl" style={{ background: `${v.tone}33` }}>
                    <v.icon className="h-5 w-5" style={{ color: INK }} />
                  </span>
                  <div className="mt-4 text-lg font-bold text-ink">{v.title}</div>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{v.sub}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* gap + scroll cue before the animation */}
        <section className="px-4 pt-14 pb-4">
          <Reveal>
            <div className="flex flex-col items-center gap-1 text-ink-faint">
              <span className="text-xs font-semibold uppercase tracking-widest">Scroll to watch her story</span>
              <ChevronDown className="h-5 w-5 animate-bounce" />
            </div>
          </Reveal>
        </section>

        {/* the scroll film — 2 scrollable viewports: mother draws in scroll 1, widgets in scroll 2 */}
        <section ref={sectionRef} className="relative h-[300vh]">
          <div ref={rootRef} className="sticky top-0 h-screen overflow-hidden">
            {/* the mother — provided line-art, centered and revealed by a scroll-driven wipe */}
            <div className="absolute left-1/2 top-1/2 h-[50vh] max-h-[440px] -translate-x-1/2 -translate-y-1/2">
              <svg viewBox="0 0 942 667" className="h-full w-auto" style={{ overflow: 'visible' }}>
                <defs>
                  <radialGradient id="bellyGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor={ROSE} stopOpacity="0.9" />
                    <stop offset="45%" stopColor={PEACH} stopOpacity="0.45" />
                    <stop offset="100%" stopColor={PEACH} stopOpacity="0" />
                  </radialGradient>
                  <clipPath id="motherClip">
                    <rect className="js-clip" x="0" y="0" width="0" height="667" />
                  </clipPath>
                </defs>
                <g clipPath="url(#motherClip)">
                  {/* the drawn mother */}
                  <path fill={INK} d={MOTHER_D} />
                  {/* belly glow — over the body, blended so the belly itself glows */}
                  <ellipse className="js-glow" cx="655" cy="500" rx="70" ry="62" fill="url(#bellyGlow)" style={{ opacity: 0, mixBlendMode: 'screen' }} />
                  {/* gentle heartbeat pulse over the belly */}
                  <g className="js-pulse" style={{ opacity: 0 }}>
                    <circle cx="655" cy="500" r="44" fill="none" stroke={ROSE} strokeWidth="2.4" style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'aboutPulse 2.8s ease-out infinite' }} />
                    <circle cx="655" cy="500" r="44" fill="none" stroke={SAGE} strokeWidth="2" style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'aboutPulse 2.8s ease-out 1.4s infinite' }} />
                  </g>
                </g>
              </svg>
            </div>

            {/* floating app-feature widgets */}
            {WIDGETS.map((w, i) => {
              const s = WSIZE[w.size];
              return (
                <div key={i} className={`absolute ${w.pos}`} style={{ animation: `aboutDrift ${w.dur}s ease-in-out ${-i}s infinite` }}>
                  <div className="js-widget opacity-0">
                    <div className={`flex items-center gap-2.5 rounded-2xl border border-white/60 bg-white/80 shadow-glass backdrop-blur-xl ${s.pad}`}>
                      <span className={`grid ${s.box} flex-none place-items-center rounded-xl`} style={{ background: `${w.tone}33` }}>
                        <w.icon className={s.icon} style={{ color: INK }} />
                      </span>
                      <div>
                        <div className={`${s.title} font-bold leading-none text-ink`}>{w.title}</div>
                        <div className={`mt-1 ${s.sub} font-medium text-ink-muted`}>{w.sub}</div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* growth chart widget (top-right) */}
            <div className="absolute right-[12%] top-[23%]" style={{ animation: 'aboutDrift 7.2s ease-in-out -2s infinite' }}>
              <div className="js-widget opacity-0">
                <div className="w-[158px] rounded-2xl border border-white/60 bg-white/80 px-3.5 py-3 shadow-glass backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[13px] font-bold leading-none text-ink">
                      <TrendingUp className="h-3.5 w-3.5" style={{ color: INK }} /> Baby’s growth
                    </div>
                  </div>
                  <svg viewBox="0 0 130 42" className="mt-2.5 w-full">
                    <defs>
                      <linearGradient id="growthFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={SAGE} stopOpacity="0.5" />
                        <stop offset="100%" stopColor={SAGE} stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M2,34 L24,31 L46,33 L68,23 L90,18 L112,11 L128,5 L128,42 L2,42 Z" fill="url(#growthFill)" />
                    <path d="M2,34 L24,31 L46,33 L68,23 L90,18 L112,11 L128,5" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="128" cy="5" r="3.2" fill={INK} />
                  </svg>
                  <div className="mt-1.5 flex items-center justify-between text-[10px] font-medium text-ink-muted">
                    <span>Weeks 20–26</span>
                    <span className="font-semibold text-emerald-600">On track</span>
                  </div>
                </div>
              </div>
            </div>

            {/* how it helps — small italic description (left) */}
            <div className="absolute left-[3%] top-[26%] max-w-[19rem]">
              <div className="js-widget opacity-0">
                <p className="font-serif text-[17px] italic leading-relaxed text-ink-soft">
                  MaternalCare+ watches over every moment — gentle reminders keep each check-up on time,
                  continuous health checks confirm baby’s heartbeat stays strong and steady, and week-by-week
                  growth charts show your little one flourishing. Worry becomes quiet confidence, always within reach.
                </p>
              </div>
            </div>

            {/* captions */}
            {CAPTIONS.map((c, i) => (
              <div key={i} className={`js-cap-${i} pointer-events-none absolute max-w-[16rem] opacity-0 ${c.pos}`}>
                <div className="font-serif text-2xl italic leading-snug text-ink sm:text-[1.7rem]">{c.t}</div>
              </div>
            ))}

            {/* progress line */}
            <div className="absolute inset-x-0 bottom-0 h-[3px] bg-ink/10">
              <div ref={barRef} className="h-full w-0" style={{ background: `linear-gradient(90deg, ${INK}, ${ROSE}, ${PEACH})` }} />
            </div>
          </div>
        </section>

        {/* outro */}
        <section className="px-4 py-24 text-center">
          <Reveal>
            <p className="mx-auto max-w-3xl font-serif text-3xl italic leading-snug text-ink sm:text-4xl">
              For mother. For child. For <span className="text-gradient not-italic">life</span>.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="mt-9 flex justify-center">
              <LiquidButton size="lg" onClick={() => navigate('/register')} iconRight={<ArrowRight className="h-[18px] w-[18px]" />}>
                Begin your journey
              </LiquidButton>
            </div>
          </Reveal>
          <Reveal delay={0.15}>
            <Link to="/" className="mt-6 inline-block text-sm font-semibold text-ink-muted transition-colors hover:text-ink">
              ← Back to home
            </Link>
          </Reveal>
        </section>
      </main>
      <Footer />
    </>
  );
}
