import type { AppleClient } from "./client.js";

export async function getAppInfoLocalizations(
  client: AppleClient,
  appId: string,
) {
  const appInfosResponse = await client.get<{
    data: Array<{ id: string }>;
  }>(`/v1/apps/${appId}/appInfos`);

  if (!appInfosResponse.data?.length) {
    throw new Error("No app info found for app");
  }

  const appInfoId = appInfosResponse.data[0].id;
  return client.get(
    `/v1/appInfos/${appInfoId}/appInfoLocalizations`,
    {
      "fields[appInfoLocalizations]": "locale,name,subtitle,privacyPolicyUrl",
    },
  );
}

export async function updateAppInfoLocalization(
  client: AppleClient,
  localizationId: string,
  attributes: {
    name?: string;
    subtitle?: string;
    privacyPolicyUrl?: string;
    privacyPolicyText?: string;
  },
) {
  return client.patch(`/v1/appInfoLocalizations/${localizationId}`, {
    data: {
      type: "appInfoLocalizations",
      id: localizationId,
      attributes,
    },
  });
}

export async function getVersionLocalizations(
  client: AppleClient,
  versionId: string,
) {
  return client.get(
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
    {
      "fields[appStoreVersionLocalizations]":
        "locale,description,keywords,whatsNew,promotionalText,marketingUrl,supportUrl",
    },
  );
}

export async function updateVersionLocalization(
  client: AppleClient,
  localizationId: string,
  attributes: {
    description?: string;
    keywords?: string;
    whatsNew?: string;
    promotionalText?: string;
    marketingUrl?: string;
    supportUrl?: string;
  },
) {
  return client.patch(
    `/v1/appStoreVersionLocalizations/${localizationId}`,
    {
      data: {
        type: "appStoreVersionLocalizations",
        id: localizationId,
        attributes,
      },
    },
  );
}

export async function createVersionLocalization(
  client: AppleClient,
  versionId: string,
  locale: string,
  attributes: {
    description?: string;
    keywords?: string;
    whatsNew?: string;
    promotionalText?: string;
    marketingUrl?: string;
    supportUrl?: string;
  },
) {
  return client.post("/v1/appStoreVersionLocalizations", {
    data: {
      type: "appStoreVersionLocalizations",
      attributes: { locale, ...attributes },
      relationships: {
        appStoreVersion: {
          data: { type: "appStoreVersions", id: versionId },
        },
      },
    },
  });
}

export async function setReleaseNotes(
  client: AppleClient,
  versionId: string,
  releaseNotes: Array<{ locale: string; whatsNew: string }>,
) {
  const localizationsResponse = await client.get<{
    data: Array<{ id: string; attributes: { locale: string } }>;
  }>(
    `/v1/appStoreVersions/${versionId}/appStoreVersionLocalizations`,
    { "fields[appStoreVersionLocalizations]": "locale" },
  );

  const existingLocales = new Map(
    localizationsResponse.data.map((l) => [l.attributes.locale, l.id]),
  );

  const results = await Promise.allSettled(
    releaseNotes.map(({ locale, whatsNew }) => {
      const existingId = existingLocales.get(locale);
      if (existingId) {
        return updateVersionLocalization(client, existingId, { whatsNew });
      }
      return createVersionLocalization(client, versionId, locale, {
        whatsNew,
      });
    }),
  );

  return results;
}
