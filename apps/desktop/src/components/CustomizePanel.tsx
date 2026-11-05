import React, { useRef, useState } from 'react';
import { useSettings } from '../context/SettingsContext';
import {
  ACCENTS,
  AccentKey,
  APPEARANCES,
  Appearance,
  AvatarId,
  AvatarShape,
  PRESET_AVATARS,
  SHAPES,
} from '../types/settings';
import { Avatar } from './Avatar';
import { PaletteIcon, CloseIcon, CheckIcon, TrashIcon } from './Icons';

interface CustomizePanelProps {
  showArt?: boolean;
  onClose?: () => void;
}

export const CustomizePanel: React.FC<CustomizePanelProps> = ({ showArt = true, onClose }) => {
  const {
    settings,
    updateSettings,
    getArts,
    uploadArt,
    deleteArt,
    restoreDefaultArts,
    setArtsList,
  } = useSettings();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const arts = getArts();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await uploadArt(file);
      e.target.value = '';
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    const newArts = [...arts];
    const draggedItem = newArts[dragIndex];
    newArts.splice(dragIndex, 1);
    newArts.splice(index, 0, draggedItem);
    setDragIndex(index);
    setArtsList(newArts);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <div
      className="customize-panel h-full min-h-0 p-4 text-xs select-none overflow-y-auto"
      style={{
        color: 'var(--c-text, #1f2433)',
        background: 'var(--c-surface, #ffffff)',
      }}
    >
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 dark:border-slate-800">
        <h3 className="font-semibold text-sm flex items-center gap-1.5">
          <PaletteIcon size={14} className="text-pink-500" />
          <span>个性化设置</span>
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <CloseIcon size={12} />
          </button>
        )}
      </div>

      {/* 1. 登录页插画 (仅在需要时展示) */}
      {showArt && (
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-slate-500">登录页插画与标语</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="text-emerald-600 hover:underline flex items-center gap-0.5"
                style={{ color: 'var(--accent-600)' }}
              >
                + 添加插画
              </button>
              <button
                onClick={restoreDefaultArts}
                className="text-slate-400 hover:text-slate-600 text-[11px]"
              >
                ↺ 恢复预设
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
          </div>

          <div className="space-y-2 mb-3">
            {arts.map((art, idx) => {
              const isActive = settings.loginArt === art.id;
              return (
                <div
                  key={art.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-2.5 p-2 rounded-lg border transition-all cursor-move ${
                    isActive
                      ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                  style={{
                    borderColor: isActive ? 'var(--accent-500)' : undefined,
                  }}
                >
                  <span className="text-slate-400 text-xs cursor-grab">⋮⋮</span>
                  <div
                    onClick={() => updateSettings({ loginArt: art.id })}
                    className="w-12 h-10 rounded overflow-hidden flex-shrink-0 cursor-pointer relative border"
                  >
                    <img src={art.src} alt={art.name} className="w-full h-full object-cover" />
                    {isActive && (
                      <span
                        className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[9px] font-bold"
                        style={{ background: 'var(--accent-600)' }}
                      >
                        <CheckIcon size={9} />
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate">{art.name}</span>
                      {art.custom && (
                        <span className="text-[10px] px-1 rounded bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                          自定义
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      maxLength={24}
                      value={art.slogan}
                      placeholder="手写标语（留空不显）"
                      onChange={(e) => {
                        const newArts = [...arts];
                        newArts[idx].slogan = e.target.value;
                        setArtsList(newArts);
                      }}
                      className="w-full text-[11px] bg-transparent border-b border-transparent hover:border-slate-300 focus:border-emerald-500 focus:outline-none text-slate-600 dark:text-slate-300 hand"
                    />
                  </div>
                  <button
                    onClick={() => deleteArt(art.id)}
                    className="p-1 text-slate-300 hover:text-red-500 transition-colors cursor-pointer"
                    title="删除此插画"
                  >
                    <TrashIcon size={13} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* 轮播设置 */}
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">轮播模式</span>
              <div className="flex rounded-md p-0.5 bg-slate-200 dark:bg-slate-800 text-[11px]">
                {(['auto', 'off', 'pin'] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => updateSettings({ carousel: m })}
                    className={`px-2 py-0.5 rounded transition-all ${
                      settings.carousel === m
                        ? 'bg-white dark:bg-slate-700 shadow-sm font-medium'
                        : 'text-slate-500'
                    }`}
                  >
                    {m === 'auto' ? '自动' : m === 'off' ? '关闭' : '固定'}
                  </button>
                ))}
              </div>
            </div>

            {settings.carousel === 'auto' && (
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-500">间隔: {settings.interval} 秒</span>
                <input
                  type="range"
                  min="5"
                  max="30"
                  step="1"
                  value={settings.interval}
                  onChange={(e) => updateSettings({ interval: Number(e.target.value) })}
                  className="w-28 accent-emerald-600"
                />
              </div>
            )}
          </div>
        </section>
      )}

      {/* 2. 昵称与头像 */}
      <section className="mb-5">
        <span className="block font-medium text-slate-500 mb-2">昵称与形象</span>
        <div className="flex items-center gap-3 mb-3">
          <Avatar size={48} />
          <div className="flex-1">
            <input
              type="text"
              maxLength={12}
              value={settings.nickname}
              placeholder="您的昵称"
              onChange={(e) => updateSettings({ nickname: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-transparent text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 10 个内联手绘 SVG 头像 */}
        <div className="grid grid-cols-5 gap-2 mb-3">
          {PRESET_AVATARS.map((av) => {
            const isSelected = settings.avatar === av.id;
            return (
              <button
                key={av.id}
                onClick={() => updateSettings({ avatar: av.id })}
                className={`p-1 rounded-xl flex flex-col items-center gap-1 transition-all border ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/60 dark:bg-emerald-950/30'
                    : 'border-transparent hover:border-slate-200'
                }`}
              >
                <Avatar id={av.id} size={34} bordered={false} />
                <span className="text-[10px] text-slate-600 dark:text-slate-400">{av.name}</span>
              </button>
            );
          })}
        </div>

        {/* 头像形状 */}
        <div className="flex items-center justify-between">
          <span className="text-slate-500">头像形状</span>
          <div className="flex gap-1.5">
            {(Object.keys(SHAPES) as AvatarShape[]).map((shape) => (
              <button
                key={shape}
                onClick={() => updateSettings({ avatarShape: shape })}
                className={`px-2.5 py-1 rounded-md text-[11px] border transition-all ${
                  settings.avatarShape === shape
                    ? 'border-emerald-500 font-medium'
                    : 'border-slate-200 text-slate-500'
                }`}
                style={{
                  borderColor: settings.avatarShape === shape ? 'var(--accent-500)' : undefined,
                }}
              >
                {SHAPES[shape][0]}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 3. 主题色 */}
      <section className="mb-5">
        <span className="block font-medium text-slate-500 mb-2">主题颜色</span>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(ACCENTS) as AccentKey[]).map((key) => {
            const [name, colors] = ACCENTS[key];
            const isSelected = settings.accent === key;
            return (
              <button
                key={key}
                onClick={() => updateSettings({ accent: key })}
                className={`flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                  isSelected ? 'border-slate-800 dark:border-white shadow-sm' : 'border-slate-200'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full flex-shrink-0"
                  style={{ background: colors[5] }}
                />
                <span className="font-medium text-xs">{name}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. 界面外观 */}
      <section className="mb-5">
        <span className="block font-medium text-slate-500 mb-2">界面外观底色</span>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(APPEARANCES) as Appearance[]).map((app) => {
            const [name, desc] = APPEARANCES[app];
            const isSelected = settings.appearance === app;
            return (
              <button
                key={app}
                onClick={() => updateSettings({ appearance: app })}
                className={`p-2 rounded-lg border text-left transition-all ${
                  isSelected ? 'border-emerald-600 shadow-sm' : 'border-slate-200'
                }`}
                style={{
                  borderColor: isSelected ? 'var(--accent-600)' : undefined,
                }}
              >
                <div className="font-medium">{name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 5. 字体 & 暗色 */}
      <section className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">全局手写风字体</div>
            <div className="text-[11px] text-slate-400">开启后界面使用 ZCOOL KuaiLe 字体</div>
          </div>
          <button
            onClick={() => updateSettings({ handFont: !settings.handFont })}
            className={`w-10 h-6 rounded-full transition-colors relative ${
              settings.handFont ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            style={{
              background: settings.handFont ? 'var(--accent-600)' : undefined,
            }}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.handFont ? 'transform translate-x-4' : ''
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium">暗色模式</div>
            <div className="text-[11px] text-slate-400">深色背景，适合夜间护眼</div>
          </div>
          <button
            onClick={() => updateSettings({ darkMode: !settings.darkMode })}
            className={`w-10 h-6 rounded-full transition-colors relative ${
              settings.darkMode ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
            }`}
            style={{
              background: settings.darkMode ? 'var(--accent-600)' : undefined,
            }}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.darkMode ? 'transform translate-x-4' : ''
              }`}
            />
          </button>
        </div>
      </section>
    </div>
  );
};
