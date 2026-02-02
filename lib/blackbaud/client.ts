import { BlackbaudConstituent, BlackbaudGift } from '@/types';
import { 
  mockConstituents, 
  mockGifts, 
  getMockConstituentByEmail, 
  getMockGiftsByConstituentId,
  getMockRecurringGifts 
} from './mock-data';

export class BlackbaudClient {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.BLACKBAUD_API_KEY || 'mock-key';
    this.baseUrl = process.env.BLACKBAUD_API_URL || 'https://api.sky.blackbaud.com';
  }

  async getConstituentByEmail(email: string): Promise<BlackbaudConstituent | null> {
    // In production, this would call the Blackbaud API
    // For now, return mock data
    return getMockConstituentByEmail(email);
  }

  async getGiftsByConstituentId(constituentId: string): Promise<BlackbaudGift[]> {
    // In production, this would call the Blackbaud API
    return getMockGiftsByConstituentId(constituentId);
  }

  async updateSolicitCodes(constituentId: string, codes: string[]): Promise<boolean> {
    // In production, this would update Blackbaud
    console.log('Would update solicit codes for', constituentId, codes);
    return true;
  }

  async logInteraction(constituentId: string, interaction: {
    type: string;
    summary: string;
    date: string;
  }): Promise<boolean> {
    // In production, this would log to Blackbaud
    console.log('Would log interaction for', constituentId, interaction);
    return true;
  }

  async updateConstituent(constituentId: string, data: Partial<BlackbaudConstituent>): Promise<boolean> {
    // In production, this would update Blackbaud
    console.log('Would update constituent', constituentId, data);
    return true;
  }

  // For testing - get all mock data
  getAllMockConstituents(): BlackbaudConstituent[] {
    return mockConstituents;
  }

  getAllMockGifts(): BlackbaudGift[] {
    return mockGifts;
  }

  getMockRecurring(): ReturnType<typeof getMockRecurringGifts> {
    return getMockRecurringGifts();
  }
}

export const blackbaudClient = new BlackbaudClient();
