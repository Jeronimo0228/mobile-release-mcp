import type { AppleClient } from "./client.js";

export async function createBetaGroup(
  client: AppleClient,
  appId: string,
  groupName: string,
  isInternal: boolean,
) {
  return client.post("/v1/betaGroups", {
    data: {
      type: "betaGroups",
      attributes: {
        name: groupName,
        isInternalGroup: isInternal,
      },
      relationships: {
        app: {
          data: { type: "apps", id: appId },
        },
      },
    },
  });
}

export async function listBetaGroups(client: AppleClient, appId: string) {
  return client.get("/v1/betaGroups", {
    "filter[app]": appId,
    "fields[betaGroups]": "name,isInternalGroup,publicLinkEnabled,publicLink",
  });
}

export async function addBuildToBetaGroup(
  client: AppleClient,
  betaGroupId: string,
  buildId: string,
) {
  return client.post(`/v1/betaGroups/${betaGroupId}/relationships/builds`, {
    data: [{ type: "builds", id: buildId }],
  });
}

export async function removeBuildFromBetaGroup(
  client: AppleClient,
  betaGroupId: string,
  buildId: string,
) {
  return client.request(
    `/v1/betaGroups/${betaGroupId}/relationships/builds`,
    {
      method: "DELETE",
      body: { data: [{ type: "builds", id: buildId }] },
    },
  );
}

export async function submitForBetaReview(
  client: AppleClient,
  buildId: string,
) {
  return client.post("/v1/betaAppReviewSubmissions", {
    data: {
      type: "betaAppReviewSubmissions",
      relationships: {
        build: {
          data: { type: "builds", id: buildId },
        },
      },
    },
  });
}

export async function addBetaTesters(
  client: AppleClient,
  betaGroupId: string,
  testers: Array<{ email: string; firstName?: string; lastName?: string }>,
) {
  const testerPromises = testers.map((tester) =>
    client.post("/v1/betaTesters", {
      data: {
        type: "betaTesters",
        attributes: {
          email: tester.email,
          firstName: tester.firstName,
          lastName: tester.lastName,
        },
        relationships: {
          betaGroups: {
            data: [{ type: "betaGroups", id: betaGroupId }],
          },
        },
      },
    }),
  );

  return Promise.allSettled(testerPromises);
}
