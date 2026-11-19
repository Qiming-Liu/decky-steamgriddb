import waitUntil from 'async-wait-until';

import getAppOverview from './getAppOverview';

const getCustomLogoPosition = async (appId: number): Promise<LogoPosition | null> => {
  try {
    const appoverview = await getAppOverview(appId);
    if (!appoverview) return null;
    return await waitUntil((): any => {
      try {
        // Steam takes the app overview here, but @decky/ui types it as an appid.
        return (window.appDetailsStore as unknown as {
          GetCustomLogoPosition: (app: AppStoreAppOverview) => LogoPosition | null | undefined;
        }).GetCustomLogoPosition(appoverview) ?? null;
      } catch (error) {
        return null;
      }
    }, { timeout: 2000, intervalBetweenAttempts: 200 });
  } catch (err) {
    return null;
  }
};

export default getCustomLogoPosition;