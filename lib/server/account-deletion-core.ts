/** Testable sequence: fresh password check precedes every privileged operation. */
export async function deleteVerifiedAccount(
  input: { userId: string; email: string; password: string },
  dependencies: {
    verifyPassword: (email: string, password: string) => Promise<string | null>;
    removeFiles: (userId: string) => Promise<void>;
    deleteUser: (userId: string) => Promise<void>;
  },
) {
  const verifiedId = await dependencies.verifyPassword(input.email, input.password);
  if (verifiedId !== input.userId)
    throw new Error('Password verification failed. Your account was not deleted.');
  await dependencies.removeFiles(input.userId);
  await dependencies.deleteUser(input.userId);
}
