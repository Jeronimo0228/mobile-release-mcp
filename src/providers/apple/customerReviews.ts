import type { AppleClient } from "./client.js";

export async function listCustomerReviews(
  client: AppleClient,
  appId: string,
  filters?: {
    rating?: string;
    territory?: string;
  },
  sort?: string,
) {
  const params: Record<string, string> = {
    "fields[customerReviews]":
      "rating,title,body,reviewerNickname,createdDate,territory",
    sort: sort || "-createdDate",
  };
  if (filters?.rating) params["filter[rating]"] = filters.rating;
  if (filters?.territory) params["filter[territory]"] = filters.territory;

  return client.get(`/v1/apps/${appId}/customerReviews`, params);
}

export async function getCustomerReview(
  client: AppleClient,
  reviewId: string,
) {
  return client.get(`/v1/customerReviews/${reviewId}`, {
    "fields[customerReviews]":
      "rating,title,body,reviewerNickname,createdDate,territory",
    include: "response",
  });
}

export async function respondToReview(
  client: AppleClient,
  reviewId: string,
  responseBody: string,
) {
  return client.post("/v1/customerReviewResponses", {
    data: {
      type: "customerReviewResponses",
      attributes: {
        responseBody,
      },
      relationships: {
        review: {
          data: { type: "customerReviews", id: reviewId },
        },
      },
    },
  });
}

export async function deleteReviewResponse(
  client: AppleClient,
  responseId: string,
) {
  return client.delete(`/v1/customerReviewResponses/${responseId}`);
}
