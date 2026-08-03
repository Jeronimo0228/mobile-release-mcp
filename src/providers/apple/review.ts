import type { AppleClient } from "./client.js";
import * as versions from "./versions.js";

export async function getVersionReviewInfo(
  client: AppleClient,
  versionId: string,
) {
  const version = await versions.getAppStoreVersion(client, versionId);

  let submission: unknown;
  try {
    submission = await client.get(
      `/v1/appStoreVersions/${versionId}/appStoreVersionSubmission`,
      {
        include: "appStoreReviewDetail",
        "fields[appStoreVersionSubmissions]":
          "platform,appStoreState,submittedDate",
        "fields[appStoreReviewDetails]":
          "contactFirstName,contactLastName,contactPhone,contactEmail,notes,demoAccountRequired,demoAccountName,demoAccountPassword",
      },
    );
  } catch {
    submission = null;
  }

  let reviewSubmissions: unknown;
  try {
    reviewSubmissions = await client.get("/v1/appStoreVersionSubmissions", {
      "filter[appStoreVersion]": versionId,
      include: "appStoreReviewDetail",
      "fields[appStoreVersionSubmissions]":
        "platform,appStoreState,submittedDate",
    });
  } catch {
    reviewSubmissions = null;
  }

  const state = (
    version as {
      data?: { attributes?: { appStoreState?: string; versionString?: string } };
    }
  ).data?.attributes;

  return {
    versionId,
    versionString: state?.versionString,
    appStoreState: state?.appStoreState,
    version,
    appStoreVersionSubmission: submission,
    reviewSubmissions,
  };
}

export async function listReviewSubmissionsForApp(
  client: AppleClient,
  appId: string,
  limit = 10,
) {
  const versionResponse = (await versions.listAppStoreVersions(
    client,
    appId,
  )) as { data: Array<{ id: string }> };

  const results = await Promise.allSettled(
    (versionResponse.data ?? []).slice(0, limit).map((v) =>
      getVersionReviewInfo(client, v.id),
    ),
  );

  return results.map((r, i) =>
    r.status === "fulfilled"
      ? r.value
      : {
          versionId: versionResponse.data?.[i]?.id,
          error: r.reason instanceof Error ? r.reason.message : String(r.reason),
        },
  );
}
