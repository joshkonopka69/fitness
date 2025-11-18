export interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  membershipType: string;
  joinDate: string;
  paymentStatus: 'paid' | 'overdue' | 'pending';
  lastPayment: string;
  monthlyFee: number;
  notes: string;
  totalSessions: number;
  attendanceRate: number;
}

export interface Attendee {
  id: string;
  name: string;
  attended: boolean;
  clientId: string;
}

export interface Session {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'strength' | 'cardio' | 'hiit' | 'yoga' | 'pilates' | 'crossfit' | 'personal';
  attendees: Attendee[];
  notes: string;
}

export const mockClients: Client[] = [
  {
    id: '1',
    name: 'Marcus Silva',
    email: 'marcus@email.com',
    phone: '+1 234-567-8901',
    membershipType: 'Premium',
    joinDate: '2024-01-15',
    paymentStatus: 'paid',
    lastPayment: '2025-10-01',
    monthlyFee: 200,
    notes: 'Focused on strength and conditioning',
    totalSessions: 48,
    attendanceRate: 92,
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    phone: '+1 234-567-8902',
    membershipType: 'Premium',
    joinDate: '2023-06-20',
    paymentStatus: 'paid',
    lastPayment: '2025-10-01',
    monthlyFee: 200,
    notes: 'Training for marathon, excellent progress',
    totalSessions: 112,
    attendanceRate: 88,
  },
  {
    id: '3',
    name: 'Alex Chen',
    email: 'alex.chen@email.com',
    phone: '+1 234-567-8903',
    membershipType: 'Basic',
    joinDate: '2025-08-10',
    paymentStatus: 'overdue',
    lastPayment: '2025-09-01',
    monthlyFee: 120,
    notes: 'New member, building foundation',
    totalSessions: 16,
    attendanceRate: 75,
  },
  {
    id: '4',
    name: 'Emma Rodriguez',
    email: 'emma.r@email.com',
    phone: '+1 234-567-8904',
    membershipType: 'Standard',
    joinDate: '2024-03-05',
    paymentStatus: 'paid',
    lastPayment: '2025-10-01',
    monthlyFee: 150,
    notes: 'Great progress on weight loss goals',
    totalSessions: 64,
    attendanceRate: 95,
  },
  {
    id: '5',
    name: 'James Wilson',
    email: 'james.w@email.com',
    phone: '+1 234-567-8905',
    membershipType: 'Personal Training',
    joinDate: '2022-11-12',
    paymentStatus: 'paid',
    lastPayment: '2025-10-01',
    monthlyFee: 300,
    notes: 'One-on-one sessions, advanced athlete',
    totalSessions: 156,
    attendanceRate: 98,
  },
  {
    id: '6',
    name: 'Olivia Martinez',
    email: 'olivia.m@email.com',
    phone: '+1 234-567-8906',
    membershipType: 'Basic',
    joinDate: '2025-09-01',
    paymentStatus: 'pending',
    lastPayment: '2025-10-01',
    monthlyFee: 120,
    notes: 'First month trial period',
    totalSessions: 8,
    attendanceRate: 100,
  },
];

const today = new Date();
const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

export const mockSessions: Session[] = [
  {
    id: '1',
    title: 'Morning HIIT Bootcamp',
    date: todayStr,
    time: '6:00 AM - 7:00 AM',
    type: 'hiit',
    attendees: [
      { id: '1', name: 'Marcus Silva', attended: true, clientId: '1' },
      { id: '2', name: 'Sarah Johnson', attended: true, clientId: '2' },
      { id: '3', name: 'Alex Chen', attended: false, clientId: '3' },
      { id: '4', name: 'Emma Rodriguez', attended: true, clientId: '4' },
    ],
    notes: 'High-intensity intervals, cardio focus',
  },
  {
    id: '2',
    title: 'Evening Strength Training',
    date: todayStr,
    time: '6:00 PM - 7:30 PM',
    type: 'strength',
    attendees: [
      { id: '5', name: 'James Wilson', attended: false, clientId: '5' },
      { id: '6', name: 'Olivia Martinez', attended: false, clientId: '6' },
      { id: '7', name: 'Marcus Silva', attended: false, clientId: '1' },
    ],
    notes: 'Upper body focus, compound movements',
  },
  {
    id: '3',
    title: 'Yoga & Mobility',
    date: '2025-10-25',
    time: '10:00 AM - 11:00 AM',
    type: 'yoga',
    attendees: [
      { id: '8', name: 'Sarah Johnson', attended: false, clientId: '2' },
      { id: '9', name: 'Emma Rodriguez', attended: false, clientId: '4' },
      { id: '10', name: 'James Wilson', attended: false, clientId: '5' },
    ],
    notes: 'Recovery and flexibility work',
  },
];
