import type { AppleClient } from "./client.js";

export async function listUsers(client: AppleClient) {
  return client.get("/v1/users", {
    "fields[users]": "username,firstName,lastName,roles,allAppsVisible",
    sort: "username",
  });
}

export async function getUser(client: AppleClient, userId: string) {
  return client.get(`/v1/users/${userId}`, {
    "fields[users]":
      "username,firstName,lastName,roles,allAppsVisible,provisioningAllowed",
    include: "visibleApps",
  });
}

export async function updateUserRoles(
  client: AppleClient,
  userId: string,
  roles: string[],
  allAppsVisible?: boolean,
) {
  const attributes: Record<string, unknown> = { roles };
  if (allAppsVisible !== undefined) attributes.allAppsVisible = allAppsVisible;

  return client.patch(`/v1/users/${userId}`, {
    data: {
      type: "users",
      id: userId,
      attributes,
    },
  });
}

export async function removeUser(client: AppleClient, userId: string) {
  return client.delete(`/v1/users/${userId}`);
}

export async function inviteUser(
  client: AppleClient,
  attributes: {
    email: string;
    firstName: string;
    lastName: string;
    roles: string[];
    allAppsVisible: boolean;
  },
  visibleAppIds?: string[],
) {
  const relationships: Record<string, unknown> = {};
  if (visibleAppIds?.length) {
    relationships.visibleApps = {
      data: visibleAppIds.map((id) => ({ type: "apps", id })),
    };
  }

  return client.post("/v1/userInvitations", {
    data: {
      type: "userInvitations",
      attributes,
      relationships,
    },
  });
}

export async function listUserInvitations(client: AppleClient) {
  return client.get("/v1/userInvitations", {
    "fields[userInvitations]":
      "email,firstName,lastName,roles,allAppsVisible,expirationDate",
  });
}
