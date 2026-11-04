/** Data needed to fill the registration form. */
export interface RegistrationData {
  company?: string; // "Others" mode: typed company name
  taxIdSearch?: string; // Thai mode: text typed in the search box (first hit is selected)
  businessType: string;
  userAmount: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  promo?: string;
}
