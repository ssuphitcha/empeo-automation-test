/** URL paths and API endpoints used by the registration flow. */
export default class PATH {
  // pages
  public static REGISTER_PAGE = '/Register/empeo';

  // registration APIs (host: API_BASE_URL)
  public static ADDITIONAL_INFORMATION = '/api/register/additional-information';
  public static TAX_SEARCH = '/api/register/tax-search';
  public static DUPLICATE_EMAIL = '/api/v2/register/DuplicateEmail';
  public static DUPLICATE_INFO = '/api/v2/register/duplicateInfo';
  public static COUPON_VALIDATION = '/api/Register/coupon-validation';
  public static REGISTER = '/api/v2/register';
  public static VERIFY_OTP = '/api/v2/register/verify-otp';
  public static RESEND_OTP = '/api/register/empeo/resend-otp';
  public static CREATE_PASSWORD_VALIDATION = '/api/v2/register/create-password/validation';
  public static CREATE_PASSWORD = '/api/v2/register/create-password';
}
