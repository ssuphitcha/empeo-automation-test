import { RegistrationData } from '../models/registration.model';
import { DataHelper } from '../helpers/data.helper';

/**
 * Builds the data of one registration. Defaults give a valid "Others" mode
 * registration with a fresh email and a fresh company name, so a run never
 * collides with an earlier one.
 */
export class RegistrationBuilder {
  private data: RegistrationData;

  constructor() {
    this.data = {
      company: DataHelper.newCompany(),
      businessType: 'eCommerce',
      userAmount: '1-20',
      email: DataHelper.newEmail(),
      firstName: 'ทดสอบ',
      lastName: 'ระบบ',
      phone: String(process.env.PHONE),
    };
  }

  withOthersCompany(company: string): this {
    this.data.company = company;
    delete this.data.taxIdSearch;
    return this;
  }

  withThaiCompany(searchText: string): this {
    this.data.taxIdSearch = searchText;
    delete this.data.company;
    return this;
  }

  withBusinessType(value: string): this {
    this.data.businessType = value;
    return this;
  }

  withUserAmount(value: string): this {
    this.data.userAmount = value;
    return this;
  }

  withEmail(email: string): this {
    this.data.email = email;
    return this;
  }

  withName(firstName: string, lastName: string): this {
    this.data.firstName = firstName;
    this.data.lastName = lastName;
    return this;
  }

  withPhone(phone: string): this {
    this.data.phone = phone;
    return this;
  }

  withPromo(code: string): this {
    this.data.promo = code;
    return this;
  }

  build(): RegistrationData {
    return { ...this.data };
  }
}
