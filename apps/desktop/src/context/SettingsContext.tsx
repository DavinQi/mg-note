import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  ACCENTS,
  DEFAULT_ARTS,
  DEFAULT_SETTINGS,
  Illustration,
  Settings,
  SHAPES,
} from '../types/settings';

const SKEY = 'mg-note-settings';
const ARTKEY = 'mg-note-login-art:';

interface SettingsContextType {
  settings: Settings;
  updateSettings: (partial: Partial<Settings>) => void;
  getArts: () => Illustration[];
  uploadArt: (file: File) => Promise<boolean>;
  deleteArt: (id: string) => void;
  restoreDefaultArts: () => void;
  setArtsList: (list: Illustration[]) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const saved = localStorage.getItem(SKEY);
      if (saved) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (_) {}
    return DEFAULT_SETTINGS;
  });

  const applyTheme = (s: Settings) => {
    const root = document.documentElement;

    // Apply 10 accent steps
    const accentColors = (ACCENTS[s.accent] || ACCENTS.emerald)[1];
    const steps = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900'];
    steps.forEach((step, idx) => {
      root.style.setProperty(`--accent-${step}`, accentColors[idx]);
    });

    // Avatar radius
    const shapeRadius = (SHAPES[s.avatarShape] || SHAPES.circle)[1];
    root.style.setProperty('--av-radius', shapeRadius);

    // Appearance & handwriting font
    root.setAttribute('data-appearance', s.appearance);
    root.setAttribute('data-hand', s.handFont ? '1' : '0');

    // Dark mode: sync both data-theme attribute and Tailwind .dark class
    if (s.darkMode) {
      root.setAttribute('data-theme', 'dark');
      root.classList.add('dark');
    } else {
      root.setAttribute('data-theme', 'light');
      root.classList.remove('dark');
    }
  };

  useEffect(() => {
    applyTheme(settings);
    try {
      localStorage.setItem(SKEY, JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

  const updateSettings = (partial: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
  };

  const getArts = (): Illustration[] => {
    const order =
      settings.loginArts ||
      DEFAULT_ARTS.map((a) => ({ id: a[0], slogan: a[3] }));

    const result: Illustration[] = [];
    for (const item of order) {
      const preset = DEFAULT_ARTS.find((a) => a[0] === item.id);
      if (preset) {
        result.push({
          id: item.id,
          name: preset[1],
          src: preset[2],
          slogan: item.slogan ?? preset[3],
          custom: false,
        });
      } else {
        const customSrc = localStorage.getItem(ARTKEY + item.id);
        if (customSrc) {
          result.push({
            id: item.id,
            name: ('name' in item && item.name) ? item.name : '自定义',
            src: customSrc,
            slogan: item.slogan || '',
            custom: true,
          });
        }
      }
    }
    return result.length > 0
      ? result
      : DEFAULT_ARTS.map((a) => ({ id: a[0], name: a[1], src: a[2], slogan: a[3], custom: false }));
  };

  const uploadArt = (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) {
        alert('仅支持 JPG / PNG / WebP 格式图片');
        return resolve(false);
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不可超过 5 MB');
        return resolve(false);
      }

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = () => {
          const W = 920;
          const ART_RATIO = 0.92;
          const H = Math.round(W / ART_RATIO);
          let sw = img.width;
          let sh = sw / ART_RATIO;
          if (sh > img.height) {
            sh = img.height;
            sw = sh * ART_RATIO;
          }

          const canvas = document.createElement('canvas');
          canvas.width = W;
          canvas.height = H;
          const ctx = canvas.getContext('2d');
          if (!ctx) return resolve(false);

          ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, W, H);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          const id = 'custom_' + Date.now().toString(36);

          try {
            localStorage.setItem(ARTKEY + id, dataUrl);
          } catch (e) {
            alert('本地存储空间不足，请先删除几张自定义插画');
            return resolve(false);
          }

          const curList = getArts();
          const updatedArts = [
            ...curList.map((a) => ({ id: a.id, name: a.name, slogan: a.slogan, custom: a.custom })),
            { id, name: file.name.replace(/\.[^.]+$/, '').slice(0, 12) || '自定义', slogan: '', custom: true },
          ];

          updateSettings({
            loginArt: id,
            loginArts: updatedArts,
          });
          resolve(true);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const deleteArt = (id: string) => {
    const list = getArts();
    if (list.length <= 1) {
      alert('至少需要保留一张插画');
      return;
    }
    const filtered = list.filter((a) => a.id !== id);
    try {
      localStorage.removeItem(ARTKEY + id);
    } catch (_) {}

    updateSettings({
      loginArts: filtered.map((a) => ({ id: a.id, name: a.name, slogan: a.slogan })),
      loginArt: settings.loginArt === id ? filtered[0].id : settings.loginArt,
    });
  };

  const restoreDefaultArts = () => {
    const list = getArts();
    DEFAULT_ARTS.forEach((p) => {
      if (!list.find((a) => a.id === p[0])) {
        list.push({ id: p[0], name: p[1], src: p[2], slogan: p[3], custom: false });
      }
    });
    updateSettings({
      loginArts: list.map((a) => ({ id: a.id, name: a.name, slogan: a.slogan })),
    });
  };

  const setArtsList = (list: Illustration[]) => {
    updateSettings({
      loginArts: list.map((a) => ({ id: a.id, name: a.name, slogan: a.slogan })),
    });
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        updateSettings,
        getArts,
        uploadArt,
        deleteArt,
        restoreDefaultArts,
        setArtsList,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
};
