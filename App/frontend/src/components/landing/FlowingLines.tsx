import { cn } from '@/lib/cn';

interface FlowingLinesProps {
  className?: string;
}

/** The wires: smooth flowing curves, each drawn with its own gradient stroke. */
const WIRES = [
  { id: 'wire-a', d: 'M-20,150 C240,70 420,210 700,140 C940,80 1140,196 1460,120', grad: 'gradA', w: 2, o: 0.9 },
  { id: 'wire-b', d: 'M-20,176 C260,112 470,238 720,166 C980,104 1180,206 1460,150', grad: 'gradB', w: 1.6, o: 0.8 },
  { id: 'wire-c', d: 'M-20,120 C220,58 430,182 690,110 C950,48 1160,162 1460,94', grad: 'gradC', w: 1.6, o: 0.75 },
  { id: 'wire-d', d: 'M-20,202 C280,150 500,256 760,196 C1000,150 1220,226 1460,180', grad: 'gradD', w: 1.4, o: 0.7 },
  { id: 'wire-e', d: 'M-20,136 C250,96 440,202 710,130 C970,70 1170,176 1460,110', grad: 'gradE', w: 1.2, o: 0.55 },
];

