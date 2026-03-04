import { checkEnvironment, installMunajjam } from "../python-check";
import {
  assertRecord,
  asOptionalString,
} from "../validation";
import { IpcHandlerError } from "../errors";
import type { RegisterHandler } from "./register-types";

export function registerEnvHandlers(register: RegisterHandler) {
  register("env:check", () => checkEnvironment());

  register("env:installMunajjam", async (_event, options) => {
    if (options !== undefined && options !== null) {
      assertRecord(options, "options");
    }

    const exitCode = await installMunajjam({
      editable: options && "editable" in options ? !!options.editable : undefined,
      packagePath:
        options && "packagePath" in options
          ? asOptionalString(options.packagePath, "options.packagePath")
          : undefined,
    });

    if (exitCode !== 0) {
      throw new IpcHandlerError("PIP_INSTALL_FAILED", `pip install exited with code ${exitCode}`, {
        exitCode,
      });
    }

    return { success: true };
  });
}
