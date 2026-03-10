import { checkEnvironment, installRuntime } from "../python-check";
import { IpcHandlerError } from "../errors";
import type { RegisterHandler } from "./register-types";

export function registerEnvHandlers(register: RegisterHandler) {
  register("env:check", () => checkEnvironment());

  register("env:installRuntime", async () => {
    const exitCode = await installRuntime();

    if (exitCode !== 0) {
      throw new IpcHandlerError("RUNTIME_INSTALL_FAILED", `Runtime installation exited with code ${exitCode}`, {
        exitCode,
      });
    }

    return { success: true };
  });
}
