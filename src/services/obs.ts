import OBSWebSocket from "obs-websocket-js";

export class ObsClient {
  private client = new OBSWebSocket();

  async connect(url: string, password: string) {
    const result = await this.client.connect(url, password || undefined, { rpcVersion: 1 });
    const [scene, studio] = await Promise.all([
      this.client.call("GetCurrentProgramScene"),
      this.client.call("GetStudioModeEnabled"),
    ]);
    return { negotiatedRpcVersion: result.negotiatedRpcVersion, currentScene: scene.currentProgramSceneName, studioMode: studio.studioModeEnabled };
  }

  async disconnect() { await this.client.disconnect(); }
  async setScene(sceneName: string) { await this.client.call("SetCurrentProgramScene", { sceneName }); }
  async toggleStream() {
    const state = await this.client.call("GetStreamStatus");
    await this.client.call(state.outputActive ? "StopStream" : "StartStream");
    return !state.outputActive;
  }
}

export const obsClient = new ObsClient();
