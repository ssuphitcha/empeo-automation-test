export interface MessageSet {
  [key: string]: string;
}

export interface ExpectedData {
  MESSAGES: { th: MessageSet; en: MessageSet };
  PLACEHOLDER: { taxId: string; companyOthers: string; businessType: string; userAmount: string };
  DROPDOWN: { businessTypeCount: number; businessTypesTh: string[]; userAmounts: string[] };
  API: {
    additionalInformation: { status: number; code: number; dataKeys: string[] };
    duplicateInfo: { infoTypeName: string; productId: number };
    register: { status: number; code: number; productId: number };
    verifyOtp: { status: number; okCode: number; wrongCode: number; wrongSubCode: string };
    createPassword: { status: number };
  };
  LINKS: { privacy: string; terms: string };
}
