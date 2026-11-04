import { APIRequestContext } from '@playwright/test';
import PATH from '../plugins/path';

export type ThaiCompany = { taxId: string; name: string };

const used = new Set<string>();

/**
 * Companies that have been used for a registration become "duplicate" and cannot
 * be used again. This finds a real Thai company that is still free by asking the
 * same APIs the page uses (tax-search, then duplicateInfo).
 */
export class CompanyHelper {
  static async findUnregisteredThaiCompany(
    request: APIRequestContext,
    terms = ['TUR', 'GRE', 'HHI', 'AIR', 'LTD', 'การบิน', 'ซีพี', 'GLOBAL', 'ASIA'],
  ): Promise<ThaiCompany> {
    const api = String(process.env.API_BASE_URL);
    for (const term of terms) {
      const res = await request.get(`${api}${PATH.TAX_SEARCH}?text=${encodeURIComponent(term)}`);
      if (!res.ok()) continue;
      const items: any[] = (await res.json()).data?.taxInfo ?? [];
      for (const c of items.filter((i) => i.branchCode === '00000').slice(0, 25)) {
        if (used.has(c.taxId)) continue;
        const dup = await request.post(`${api}${PATH.DUPLICATE_INFO}/`, {
          data: { text: c.companyName, email: '', infoTypeName: 'CompanyName', productId: 102 },
        });
        if (dup.ok() && (await dup.json()).data?.isDuplicate === false) {
          used.add(c.taxId);
          return { taxId: c.taxId, name: c.companyName };
        }
      }
    }
    throw new Error('No unregistered Thai company found with the given search terms');
  }
}
