/**
 * GitHub PR Comment Service
 *
 * Domain logic for resolving/unresolving PR review threads via the
 * GitHub GraphQL API. Extracted from the route handler so the route
 * only deals with request/response plumbing.
 */

import { spawnProcess } from '@automaker/platform';

/** Timeout for GitHub GraphQL API requests in milliseconds */
const GITHUB_API_TIMEOUT_MS = 30000;

interface GraphQLMutationResponse {
  data?: {
    resolveReviewThread?: {
      thread?: { isResolved: boolean; id: string } | null;
    } | null;
    unresolveReviewThread?: {
      thread?: { isResolved: boolean; id: string } | null;
    } | null;
  };
  errors?: Array<{ message: string }>;
}

/**
 * Execute a GraphQL mutation to resolve or unresolve a review thread.
 */
export async function executeReviewThreadMutation(
  projectPath: string,
  threadId: string,
  resolve: boolean
): Promise<{ isResolved: boolean }> {
  const mutationName = resolve ? 'resolveReviewThread' : 'unresolveReviewThread';

  const mutation = `
    mutation ${resolve ? 'ResolveThread' : 'UnresolveThread'}($threadId: ID!) {
      ${mutationName}(input: { threadId: $threadId }) {
        thread {
          id
          isResolved
        }
      }
    }`;

  const variables = { threadId };
  const requestBody = JSON.stringify({ query: mutation, variables });

  const { stdout, exitCode, stderr } = await spawnProcess({
    command: 'gh',
    args: ['api', 'graphql', '--input', '-'],
    cwd: projectPath,
    input: requestBody,
    timeout: GITHUB_API_TIMEOUT_MS,
  });

  if (exitCode !== 0) {
    throw new Error(`gh process exited with code ${exitCode}: ${stderr}`);
  }

  const response: GraphQLMutationResponse = JSON.parse(stdout);

  if (response.errors && response.errors.length > 0) {
    throw new Error(response.errors[0].message);
  }

  const threadData = resolve
    ? response.data?.resolveReviewThread?.thread
    : response.data?.unresolveReviewThread?.thread;

  if (!threadData) {
    throw new Error('No thread data returned from GitHub API');
  }

  return { isResolved: threadData.isResolved };
}
