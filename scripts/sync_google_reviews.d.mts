export interface SyncReviewInput {
  reviewId: string;
  authorName: string;
  authorUri?: string;
  authorPhoto?: string;
  guideBadge?: string;
  rating: number;
  text: string;
  relativeTime?: string;
  publishTime: string;
}

export interface ExpectedBusiness {
  nameToken?: string;
  city?: string;
  domain?: string;
  phoneDigits?: string;
}

export interface PlaceCandidate {
  displayName?: { text?: string } | string;
  formattedAddress?: string;
  address?: string;
  websiteUri?: string;
  website?: string;
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  phone?: string;
}

export function verifyExactBusinessMatch(place: PlaceCandidate, expected: ExpectedBusiness): boolean;
export function selectLatestFiveStarWindow(
  incomingReviews: SyncReviewInput[],
  existingPool?: SyncReviewInput[],
  options?: { fetchLimit?: number; displayLimit?: number }
): { recentPool: SyncReviewInput[]; fiveStarLatest: SyncReviewInput[] };
