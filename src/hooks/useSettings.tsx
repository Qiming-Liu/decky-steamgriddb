import {
  createContext,
  FC,
  ReactNode,
  useContext,
  useMemo,
} from 'react';
import { call } from '@decky/api';
import debounce from 'just-debounce';

import log from '../utils/log';

export const SettingsContext = createContext({});

type SettingsContextType = {
  set: (key: any, value: any, immediate?: boolean) => void;
  get: (key: any, fallback: any) => Promise<any>;
  settings: any;
};

export const SettingsProvider: FC<{ children: ReactNode }> = ({ children }) => {
  // Writes go straight to the backend: several settings changed in one tick
  // (e.g. a reset) must all be saved, not just the last one.
  const save = useMemo(() => async (key: any, value: any) => {
    log('writing setting', key, value);
    await call('set_setting', key, value);
  }, []);

  const saveDb = useMemo(() => debounce(save, 1500), [save]);

  const set = useMemo(() => (key, value, immediate = false) => {
    if (immediate) {
      return save(key, value);
    }
    return saveDb(key, value);
  }, [save, saveDb]) as SettingsContextType['set'];

  const get: SettingsContextType['get'] = useMemo(() => async (key, fallback) => {
    return await call('get_setting', key, fallback);
  }, []);

  return (
    <SettingsContext.Provider value={{ set, get }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext) as SettingsContextType;

export default useSettings;
