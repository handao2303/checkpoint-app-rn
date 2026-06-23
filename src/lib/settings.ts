import { getItem, setItem } from "./storage";

const OPEN_CREATE_ON_LAUNCH_KEY = "cp.settings.openCreateOnLaunch";
const PREFER_CAMERA_ON_CHECKIN_KEY = "cp.settings.preferCameraOnCheckin";

export const quickCheckinSettings = {
  get openCreateOnLaunch(): boolean {
    return getItem(OPEN_CREATE_ON_LAUNCH_KEY) === "true";
  },
  set openCreateOnLaunch(value: boolean) {
    setItem(OPEN_CREATE_ON_LAUNCH_KEY, String(value));
  },
  get preferCameraOnCheckin(): boolean {
    return getItem(PREFER_CAMERA_ON_CHECKIN_KEY) === "true";
  },
  set preferCameraOnCheckin(value: boolean) {
    setItem(PREFER_CAMERA_ON_CHECKIN_KEY, String(value));
  },
};
