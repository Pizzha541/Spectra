import { beforeEach, expect, it, vi } from "vitest";
import { invoke } from "@tauri-apps/api/core";
import { checkUpdates, deferUpdate, downloadUpdate, installUpdate, useUpdates } from "./updates";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn(), isTauri: () => true, Channel: class {} }));
vi.mock("@tauri-apps/api/app", () => ({ getVersion: async () => "0.2.0" }));
const rpc = vi.mocked(invoke);
const offer = { version: "0.3.0", notes: "Cambios de prueba" };
beforeEach(() => {
  rpc.mockReset();
  useUpdates.setState(useUpdates.getInitialState());
});

it("permite aplazar, recuperar el aviso y confirmar la instalación por separado", async () => {
  rpc.mockResolvedValue(offer);
  await checkUpdates();
  expect(useUpdates.getState().visible).toBe(true);
  deferUpdate();
  await checkUpdates();
  expect(useUpdates.getState().visible).toBe(false);
  await checkUpdates(true);
  expect(useUpdates.getState().visible).toBe(true);
  await installUpdate();
  expect(rpc).not.toHaveBeenCalledWith("install_release", expect.anything());
  await downloadUpdate();
  expect(useUpdates.getState().phase).toBe("ready");
  expect(rpc).not.toHaveBeenCalledWith("install_release", expect.anything());
  await installUpdate();
  expect(rpc).toHaveBeenLastCalledWith("install_release", { version: offer.version });
});

it("permite reintentar después de perder conexión o de rechazar la firma", async () => {
  rpc.mockRejectedValueOnce(new Error("offline"));
  await checkUpdates();
  expect(useUpdates.getState().phase).toBe("idle");
  rpc.mockResolvedValueOnce(offer);
  await checkUpdates();
  rpc.mockRejectedValueOnce(new Error("signature"));
  await downloadUpdate();
  expect(useUpdates.getState().phase).toBe("available");
  await installUpdate();
  expect(rpc).not.toHaveBeenCalledWith("install_release", expect.anything());
});
