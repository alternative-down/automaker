export function useSettingsMigration() {
  return {
    isMigrating: false,
    migrated: true,
  };
}

export async function forceSyncSettingsToServer(): Promise<boolean> {
  return true;
}

export async function syncSettingsToServer(): Promise<boolean> {
  return true;
}

export async function loadMCPServersFromServer(): Promise<any[]> {
  return [];
}
