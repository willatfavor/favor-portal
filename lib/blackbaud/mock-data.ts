/**
 * Mock data for Blackbaud constituents and gifts
 * This simulates what would come from Blackbaud SKY API
 */

import { BlackbaudConstituent, BlackbaudGift } from '@/types';

export const mockConstituents: BlackbaudConstituent[] = [
  {
    id: 'BB-001-IND',
    email: 'partner@example.com',
    firstName: 'John',
    lastName: 'Smith',
    address: {
      street: '123 Main St',
      city: 'Tampa',
      state: 'FL',
      zip: '33601'
    },
    phone: '+1-555-0101',
    constituentCode: 'individual',
    lifetimeGiving: 3500.00,
    solicitCodes: [],
    rddAssignment: 'Florida - Sarah Johnson'
  },
  {
    id: 'BB-002-MAJOR',
    email: 'major@example.com',
    firstName: 'Sarah',
    lastName: 'Williams',
    address: {
      street: '456 Oak Avenue',
      city: 'Austin',
      state: 'TX',
      zip: '78701'
    },
    phone: '+1-555-0102',
    constituentCode: 'major_donor',
    lifetimeGiving: 75000.00,
    solicitCodes: [],
    rddAssignment: 'Texas - Michael Chen'
  },
  {
    id: 'BB-003-CHURCH',
    email: 'pastor@gracechurch.org',
    firstName: 'Pastor David',
    lastName: 'Johnson',
    address: {
      street: '789 Grace Blvd',
      city: 'Nashville',
      state: 'TN',
      zip: '37201'
    },
    phone: '+1-555-0103',
    constituentCode: 'church',
    lifetimeGiving: 12500.00,
    solicitCodes: [],
    rddAssignment: 'Tennessee - Rebecca Martinez'
  },
  {
    id: 'BB-004-FOUND',
    email: 'grants@hopefoundation.org',
    firstName: 'Elizabeth',
    lastName: 'Thompson',
    address: {
      street: '100 Foundation Plaza',
      city: 'New York',
      state: 'NY',
      zip: '10001'
    },
    phone: '+1-555-0104',
    constituentCode: 'foundation',
    lifetimeGiving: 250000.00,
    solicitCodes: [],
    rddAssignment: 'Northeast - James Wilson'
  },
  {
    id: 'BB-005-DAF',
    email: 'donor@fidelity.com',
    firstName: 'Robert',
    lastName: 'Anderson',
    address: {
      street: '200 DAF Street',
      city: 'Boston',
      state: 'MA',
      zip: '02101'
    },
    phone: '+1-555-0105',
    constituentCode: 'daf',
    lifetimeGiving: 15000.00,
    solicitCodes: [],
    rddAssignment: 'Northeast - James Wilson'
  },
  {
    id: 'BB-006-AMB',
    email: 'ambassador@favorintl.org',
    firstName: 'Maria',
    lastName: 'Garcia',
    address: {
      street: '300 Ambassador Lane',
      city: 'Denver',
      state: 'CO',
      zip: '80201'
    },
    phone: '+1-555-0106',
    constituentCode: 'ambassador',
    lifetimeGiving: 8500.00,
    solicitCodes: [],
    rddAssignment: 'Mountain West - Lisa Park'
  }
];

export const mockGifts: BlackbaudGift[] = [
  // John Smith (Individual Partner) gifts
  { id: 'G-001', constituentId: 'BB-001-IND', amount: 100.00, date: '2024-12-15', designation: 'General Operations', type: 'one_time' },
  { id: 'G-002', constituentId: 'BB-001-IND', amount: 100.00, date: '2024-11-15', designation: 'General Operations', type: 'one_time' },
  { id: 'G-003', constituentId: 'BB-001-IND', amount: 100.00, date: '2024-10-15', designation: 'Education Fund', type: 'recurring' },
  { id: 'G-004', constituentId: 'BB-001-IND', amount: 250.00, date: '2024-09-20', designation: 'Clean Water Initiative', type: 'one_time' },
  { id: 'G-005', constituentId: 'BB-001-IND', amount: 100.00, date: '2024-08-15', designation: 'General Operations', type: 'recurring' },
  { id: 'G-006', constituentId: 'BB-001-IND', amount: 500.00, date: '2024-07-01', designation: 'Christmas Gift Drive', type: 'one_time', campaign: 'Holiday 2024' },
  { id: 'G-007', constituentId: 'BB-001-IND', amount: 100.00, date: '2024-06-15', designation: 'General Operations', type: 'recurring' },
  { id: 'G-008', constituentId: 'BB-001-IND', amount: 100.00, date: '2024-05-15', designation: 'General Operations', type: 'recurring' },
  { id: 'G-009', constituentId: 'BB-001-IND', amount: 100.00, date: '2024-04-15', designation: 'General Operations', type: 'recurring' },
  { id: 'G-010', constituentId: 'BB-001-IND', amount: 100.00, date: '2024-03-15', designation: 'General Operations', type: 'recurring' },
  { id: 'G-011', constituentId: 'BB-001-IND', amount: 100.00, date: '2024-02-15', designation: 'General Operations', type: 'recurring' },
  { id: 'G-012', constituentId: 'BB-001-IND', amount: 100.00, date: '2024-01-15', designation: 'General Operations', type: 'recurring' },
  { id: 'G-013', constituentId: 'BB-001-IND', amount: 250.00, date: '2023-12-20', designation: 'Year-End Giving', type: 'one_time', campaign: 'Year-End 2023' },
  { id: 'G-014', constituentId: 'BB-001-IND', amount: 100.00, date: '2023-11-15', designation: 'General Operations', type: 'recurring' },
  { id: 'G-015', constituentId: 'BB-001-IND', amount: 100.00, date: '2023-10-15', designation: 'General Operations', type: 'recurring' },
  
  // Sarah Williams (Major Donor) gifts
  { id: 'G-101', constituentId: 'BB-002-MAJOR', amount: 10000.00, date: '2024-12-01', designation: 'Strategic Initiatives', type: 'one_time' },
  { id: 'G-102', constituentId: 'BB-002-MAJOR', amount: 10000.00, date: '2024-09-01', designation: 'Education Expansion', type: 'one_time' },
  { id: 'G-103', constituentId: 'BB-002-MAJOR', amount: 5000.00, date: '2024-06-15', designation: 'Clean Water Initiative', type: 'one_time' },
  { id: 'G-104', constituentId: 'BB-002-MAJOR', amount: 10000.00, date: '2024-03-01', designation: 'Strategic Initiatives', type: 'one_time' },
  { id: 'G-105', constituentId: 'BB-002-MAJOR', amount: 25000.00, date: '2023-12-15', designation: 'Multi-Year Commitment', type: 'one_time', campaign: 'Vision 2024' },
  { id: 'G-106', constituentId: 'BB-002-MAJOR', amount: 5000.00, date: '2023-06-01', designation: 'Emergency Relief', type: 'one_time' },
  { id: 'G-107', constituentId: 'BB-002-MAJOR', amount: 10000.00, date: '2023-01-15', designation: 'Strategic Initiatives', type: 'one_time' },
  
  // Pastor Johnson (Church) gifts
  { id: 'G-201', constituentId: 'BB-003-CHURCH', amount: 500.00, date: '2024-12-01', designation: 'General Operations', type: 'one_time' },
  { id: 'G-202', constituentId: 'BB-003-CHURCH', amount: 1000.00, date: '2024-11-15', designation: 'Thanksgiving Offering', type: 'one_time', campaign: 'Church Partners' },
  { id: 'G-203', constituentId: 'BB-003-CHURCH', amount: 500.00, date: '2024-10-01', designation: 'General Operations', type: 'one_time' },
  { id: 'G-204', constituentId: 'BB-003-CHURCH', amount: 2000.00, date: '2024-07-15', designation: 'Mission Sunday', type: 'one_time', campaign: 'Church Partners' },
  { id: 'G-205', constituentId: 'BB-003-CHURCH', amount: 500.00, date: '2024-04-01', designation: 'General Operations', type: 'one_time' },
  { id: 'G-206', constituentId: 'BB-003-CHURCH', amount: 1500.00, date: '2024-01-15', designation: 'Year Start Commitment', type: 'one_time' },
  
  // Foundation gifts
  { id: 'G-301', constituentId: 'BB-004-FOUND', amount: 50000.00, date: '2024-12-01', designation: 'Grant - Education Program', type: 'one_time' },
  { id: 'G-302', constituentId: 'BB-004-FOUND', amount: 25000.00, date: '2024-06-01', designation: 'Grant - Healthcare Initiative', type: 'one_time' },
  { id: 'G-303', constituentId: 'BB-004-FOUND', amount: 100000.00, date: '2023-12-01', designation: 'Multi-Year Grant', type: 'one_time', campaign: '3-Year Partnership' },
  { id: 'G-304', constituentId: 'BB-004-FOUND', amount: 50000.00, date: '2023-06-01', designation: 'Grant - Capacity Building', type: 'one_time' },
  { id: 'G-305', constituentId: 'BB-004-FOUND', amount: 25000.00, date: '2023-01-15', designation: 'Emergency Response Grant', type: 'one_time' },
  
  // DAF gifts
  { id: 'G-401', constituentId: 'BB-005-DAF', amount: 5000.00, date: '2024-12-15', designation: 'DAF Grant - General', type: 'one_time' },
  { id: 'G-402', constituentId: 'BB-005-DAF', amount: 3000.00, date: '2024-08-20', designation: 'DAF Grant - Education', type: 'one_time' },
  { id: 'G-403', constituentId: 'BB-005-DAF', amount: 2500.00, date: '2024-04-10', designation: 'DAF Grant - General', type: 'one_time' },
  { id: 'G-404', constituentId: 'BB-005-DAF', amount: 4500.00, date: '2023-12-20', designation: 'DAF Grant - Year End', type: 'one_time' },
  
  // Ambassador gifts
  { id: 'G-501', constituentId: 'BB-006-AMB', amount: 250.00, date: '2024-12-01', designation: 'General Operations', type: 'one_time' },
  { id: 'G-502', constituentId: 'BB-006-AMB', amount: 500.00, date: '2024-09-15', designation: 'Ambassador Fundraising', type: 'one_time', campaign: 'Ambassador Drive' },
  { id: 'G-503', constituentId: 'BB-006-AMB', amount: 250.00, date: '2024-06-01', designation: 'General Operations', type: 'one_time' },
  { id: 'G-504', constituentId: 'BB-006-AMB', amount: 3000.00, date: '2024-04-20', designation: 'Ambassador Event', type: 'one_time', campaign: 'Spring Gala' },
  { id: 'G-505', constituentId: 'BB-006-AMB', amount: 200.00, date: '2024-01-15', designation: 'General Operations', type: 'one_time' },
  { id: 'G-506', constituentId: 'BB-006-AMB', amount: 1500.00, date: '2023-11-10', designation: 'Ambassador Event', type: 'one_time', campaign: 'Fall Dinner' },
  { id: 'G-507', constituentId: 'BB-006-AMB', amount: 250.00, date: '2023-07-01', designation: 'General Operations', type: 'one_time' },
];

export function getMockConstituentByEmail(email: string): BlackbaudConstituent | null {
  return mockConstituents.find(c => c.email.toLowerCase() === email.toLowerCase()) || null;
}

export function getMockGiftsByConstituentId(constituentId: string): BlackbaudGift[] {
  return mockGifts.filter(g => g.constituentId === constituentId).sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
}

export function getMockRecurringGifts(): { constituentId: string; amount: number; frequency: 'monthly' | 'quarterly' | 'annual'; nextChargeDate: string; status: 'active' | 'paused' | 'cancelled' }[] {
  return [
    { constituentId: 'BB-001-IND', amount: 100.00, frequency: 'monthly', nextChargeDate: '2025-01-15', status: 'active' },
    { constituentId: 'BB-002-MAJOR', amount: 1000.00, frequency: 'monthly', nextChargeDate: '2025-01-01', status: 'active' },
    { constituentId: 'BB-006-AMB', amount: 250.00, frequency: 'quarterly', nextChargeDate: '2025-03-01', status: 'active' },
  ];
}
