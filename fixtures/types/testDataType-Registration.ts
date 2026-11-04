export interface CompanySearchData {
  thai_name: string;
  english_name: string;
  english_company_full: string;
  english_company_tax_id: string;
  unknown_name: string;
  thai_2_chars: string;
  english_2_chars: string;
  thai_3_chars: string;
  english_3_chars: string;
  thai_long: string;
  english_long: string;
  tax_id_7: string;
  tax_id_12: string;
  tax_id_13: string;
  tax_id_14: string;
  japanese: string;
  japanese_company: string;
  japanese_tax_id: string;
  special: string;
  special_short: string;
  mixed: string;
  cpc_company_full: string;
  cpc_company_part: string;
}

export interface TextData {
  thai: string;
  english: string;
  japanese: string;
  special: string;
  mixed: string;
  digits: string;
  spaces_3: string;
  spaces_5: string;
  emoji_company: string;
  padded_company: string;
  existing_company_name: string;
  company_thai: string;
  company_english: string;
  company_japanese: string;
  company_mixed: string;
  company_digits: string;
  company_special: string;
  company_special_dot_comma: string;
  company_single_char_en: string;
  company_single_char_th: string;
}

export interface LengthData {
  text_max: number;
  email_max: number;
  promo_max: number;
  phone_max: number;
}

export interface DropdownData {
  business_type: string;
  business_type_other: string;
  user_amount: string;
  user_amount_other: string;
  user_amount_default: string;
}

export interface EmailData {
  valid_fresh_domain: string;
  domain_in_use_1: string;
  domain_in_use_2: string;
  thai: string;
  english: string;
  japanese: string;
  special: string;
  digits: string;
  invalid_formats: string[];
  short_invalid: string;
  short_valid: string;
}

export interface PhoneData {
  thai_leading_0: string;
  thai_no_leading_0: string;
  japan: string;
  thai_11_digits: string;
  too_long: string;
  thai_9_digits: string;
  five_digits: string;
  letters: string;
}

export interface PromoData {
  valid: string;
  lowercase: string;
  invalid: string;
  thai: string;
  japanese: string;
  special: string;
  mixed: string;
  digits: string;
  with_spaces: string;
}

export interface PasswordData {
  valid: string;
  valid_alt: string;
  only_lowercase: string;
  only_uppercase: string;
  no_digit: string;
  too_short: string;
  weak: string;
  mismatch_partial: string;
  mismatch_other: string;
}

export interface OtpData {
  wrong: string;
  five_digits: string;
}

export interface RegistrationTestData {
  COMPANY_SEARCH: CompanySearchData;
  TEXT: TextData;
  LENGTH: LengthData;
  DROPDOWN: DropdownData;
  EMAIL: EmailData;
  PHONE: PhoneData;
  PROMO: PromoData;
  PASSWORD: PasswordData;
  OTP: OtpData;
}
