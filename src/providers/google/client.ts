import { androidpublisher_v3, auth as googleAuth } from "@googleapis/androidpublisher";
import type { GoogleConfig } from "../../utils/config.js";
import { logger } from "../../utils/logger.js";
import { withRetry } from "../../utils/retry.js";

export class GooglePlayClient {
  private publisher: androidpublisher_v3.Androidpublisher;

  constructor(config: GoogleConfig) {
    const authClient = new googleAuth.GoogleAuth({
      credentials: config.serviceAccountKey as Record<string, string>,
      scopes: ["https://www.googleapis.com/auth/androidpublisher"],
    });

    this.publisher = new androidpublisher_v3.Androidpublisher({
      auth: authClient,
    });

    logger.info("Google Play client initialized");
  }

  get api() {
    return this.publisher;
  }

  async createEdit(packageName: string): Promise<string> {
    return withRetry(async () => {
      const res = await this.publisher.edits.insert({ packageName });
      const editId = res.data.id;
      if (!editId) throw new Error("Failed to create edit");
      logger.debug(`Created edit ${editId} for ${packageName}`);
      return editId;
    }, `Google createEdit ${packageName}`);
  }

  async deleteEdit(packageName: string, editId: string): Promise<void> {
    await withRetry(async () => {
      await this.publisher.edits.delete({ packageName, editId });
      logger.debug(`Deleted edit ${editId} for ${packageName}`);
    }, `Google deleteEdit ${packageName}`);
  }

  async commitEdit(packageName: string, editId: string): Promise<void> {
    await withRetry(async () => {
      await this.publisher.edits.commit({ packageName, editId });
      logger.debug(`Committed edit ${editId} for ${packageName}`);
    }, `Google commitEdit ${packageName}`);
  }

  async validateEdit(packageName: string, editId: string): Promise<void> {
    await withRetry(async () => {
      await this.publisher.edits.validate({ packageName, editId });
      logger.debug(`Validated edit ${editId} for ${packageName}`);
    }, `Google validateEdit ${packageName}`);
  }

  async withEdit<T>(
    packageName: string,
    fn: (editId: string) => Promise<T>,
  ): Promise<T> {
    const editId = await this.createEdit(packageName);
    try {
      return await fn(editId);
    } finally {
      try {
        await this.deleteEdit(packageName, editId);
      } catch (err) {
        logger.warn(
          `Failed to delete temporary edit ${editId} for ${packageName}`,
          err,
        );
      }
    }
  }
}
