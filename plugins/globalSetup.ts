import dotenv from 'dotenv';
import path from 'path';

/** Loads configs/.env.<envName> (default: uat) before any test starts. */
async function globalSetup() {
  const envName = process.env.envName || 'uat';
  dotenv.config({ path: path.resolve(__dirname, `../configs/.env.${envName}`), override: true, quiet: true });
}

export default globalSetup;
