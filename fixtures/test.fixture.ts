import { test as base } from '@playwright/test';
import { SpotlightHelper } from '../helpers/spotlight.helper';
import { EvidenceRecorder } from '../helpers/evidence.helper';
import { RegisterPage } from '../pageObjects/register/RegisterPage';
import { OtpModal } from '../pageObjects/register/OtpModal';
import { CreatePasswordPage } from '../pageObjects/password/CreatePasswordPage';
import { LoginPage } from '../pageObjects/login/LoginPage';
import { RegistrationFlow } from '../pageObjects/register/registrationFlow';
import { RegistrationBuilder } from '../builders/registration.builder';
import { RegistrationData } from '../models/registration.model';
import { RegistrationTestData } from './types/testDataType-Registration';
import { ExpectedData } from './types/expectedDataType-Registration';
import testDataJson from './testData/testData-Registration.json';
import expectedJson from './expected/expectedData-Registration.json';

type Fixtures = {
  evidence: void;
  /** static test data (fixtures/testData) */
  testData: RegistrationTestData;
  /** expected messages and API values (fixtures/expected) */
  expected: ExpectedData;
  /** registration page already opened (Thai) */
  registerPage: RegisterPage;
  /** registration page already opened with the "Others" radio selected */
  othersRegisterPage: RegisterPage;
  otpModal: OtpModal;
  createPasswordPage: CreatePasswordPage;
  loginPage: LoginPage;
  /** reusable submit -> OTP -> password -> login steps */
  flow: RegistrationFlow;
  /** a valid "Others" registration with a fresh email and company */
  validRegistration: RegistrationData;
  /** creates more builders when a test needs several registrations */
  newRegistration: () => RegistrationBuilder;
  /** shared values from configs/.env.<env> */
  env: { phone: string; otp: string; promo: string; password: string; otpWaitSeconds: number };
};

/** Recorder of the test that is running now (workers = 1, so one at a time). */
let current: { page: import('@playwright/test').Page; recorder: EvidenceRecorder } | undefined;

export const test = base.extend<Fixtures>({
  /**
   * Evidence layer, active in every test: red frame + step caption in the video,
   * and a record of the API calls for the HTML evidence report.
   */
  evidence: [
    async ({ page }, use, testInfo) => {
      await SpotlightHelper.install(page);
      const recorder = new EvidenceRecorder(page, process.env.API_BASE_URL ?? '');
      current = { page, recorder };
      await use();
      await recorder.attach(testInfo);
      current = undefined;
    },
    { auto: true },
  ],

  testData: async ({}, use) => {
    await use(testDataJson as unknown as RegistrationTestData);
  },

  expected: async ({}, use) => {
    await use(expectedJson as unknown as ExpectedData);
  },

  registerPage: async ({ page }, use) => {
    const registerPage = new RegisterPage(page);
    await registerPage.goto();
    await use(registerPage);
  },

  othersRegisterPage: async ({ registerPage }, use) => {
    await registerPage.chooseOthers();
    await use(registerPage);
  },

  otpModal: async ({ page }, use) => {
    await use(new OtpModal(page));
  },

  createPasswordPage: async ({ page }, use) => {
    await use(new CreatePasswordPage(page));
  },

  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  flow: async ({ page, registerPage, otpModal, createPasswordPage, loginPage }, use) => {
    await use(new RegistrationFlow(page, registerPage, otpModal, createPasswordPage, loginPage));
  },

  validRegistration: async ({}, use) => {
    await use(new RegistrationBuilder().build());
  },

  newRegistration: async ({}, use) => {
    await use(() => new RegistrationBuilder());
  },

  env: async ({}, use) => {
    await use({
      phone: String(process.env.PHONE),
      otp: String(process.env.OTP_OK),
      otpWaitSeconds: Number(process.env.OTP_WAIT_SECONDS ?? 35),
      promo: String(process.env.PROMO_OK),
      password: String(process.env.PASSWORD_OK),
    });
  },
});

export { expect } from '@playwright/test';

/**
 * test.step also shows its title as a caption in the video and tells the recorder
 * which step is running, so API calls land under the right step in the report.
 */
const originalStep = test.step.bind(test);
(test as any).step = <T>(title: string, body: () => Promise<T>, options?: any): Promise<T> =>
  originalStep(
    title,
    async () => {
      const ctx = current;
      ctx?.recorder.enter();
      if (ctx) await SpotlightHelper.caption(ctx.page, title);
      try {
        return await body();
      } finally {
        ctx?.recorder.leave();
      }
    },
    options,
  );
